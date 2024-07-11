import { Command } from "commander";
import { findWorkspaceDir } from "@pnpm/find-workspace-dir";
import { findWorkspacePackages } from "@pnpm/workspace.find-packages";
import { readFile, writeFile, access } from "node:fs/promises";
import { relative } from "node:path";
import chalk from "chalk";
import JSON5 from "json5";

const program = new Command();

program
  .command("ts.paths")
  .description(
    "Update tsconfig.json `compilerOptions.paths` to point correctly to linked packages",
  )
  .action(async () => {
    const workspaceRoot = await findWorkspaceDir(process.cwd());
    if (!workspaceRoot) {
      console.error("No workspace found");
      process.exit(1);
    }
    const packages = await findWorkspacePackages(workspaceRoot);
    const packagesByName = Object.fromEntries(
      packages.map((pkg) => [pkg.manifest.name, pkg]),
    );
    for (const { manifest, rootDir } of packages) {
      console.log(chalk.blue(`Checking ${manifest.name}`));
      const linkedPackages: Array<string> = [];
      for (const [packageName, packageVersion] of Object.entries(
        manifest.dependencies || {},
      )) {
        if (packageVersion.startsWith("workspace:")) {
          console.log(chalk.green(`"${packageName}" is linked`));
          linkedPackages.push(packageName);
        }
      }
      const tsConfigPath = `${rootDir}/tsconfig.json`;

      // does the file exist?
      try {
        await access(tsConfigPath);
      } catch (e) {
        console.error(chalk.gray(`No tsconfig found for ${rootDir}`));
        continue;
      }

      const tsConfig = JSON5.parse(await readFile(tsConfigPath, "utf-8"));
      const compilerOptions = (tsConfig.compilerOptions ??= {});
      const paths = (compilerOptions.paths ??= {});
      let didChange = false;

      for (const linkedPackageName of linkedPackages) {
        const linkedPackage = packagesByName[linkedPackageName];
        const relativePath = relative(rootDir, linkedPackage.rootDir);
        if (
          !paths[linkedPackageName] ||
          paths[linkedPackageName][0] !== relativePath
        ) {
          paths[linkedPackageName] = [relativePath];
          didChange = true;
        }
      }

      if (didChange) {
        console.log(chalk.yellow(`Updating tsconfig for ${rootDir}`));
        await writeFile(tsConfigPath, JSON.stringify(tsConfig, null, 2));
      }
    }
  });

program.parse(process.argv);
