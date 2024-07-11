const WORKSPACE_VERSION_RE = /^workspace:(.*)$/;

export function isLinkedPackage(_packageName: string, packageVersion: string) {
  const match = packageVersion.match(WORKSPACE_VERSION_RE);
  return match !== null;
}
