import { describe, test, it, expect, beforeAll, afterAll } from "@jest/globals";

import PouchDB from "pouchdb";
import PouchDbMemory from "pouchdb-adapter-memory";
import PouchDbFind from "pouchdb-find";

import { createMigrationPlanner } from "../createMigrationPlanner";
import { createRunner } from "../createRunner";
import {
  Action,
  Migration,
  MigrationRecord,
  MigrationRunner,
  MigrationRunnerConfig,
  MigrationState,
} from "../migrations.types";

PouchDB.plugin(PouchDbMemory);
PouchDB.plugin(PouchDbFind);

describe("PouchDB", () => {
  type PouchMigrationArgs = [PouchDB.Database];

  test("smoke test", async () => {
    const db = new PouchDB("testdb", { adapter: "memory" });
    await db.put({ _id: "foo", value: "bar" });
    const result = await db.get<{ value: string }>("foo");
    expect(result.value).toBe("bar");
  });

  describe("static set of migrations", () => {
    let db: PouchDB.Database<any>;
    let pouchMigrationConfig: MigrationRunnerConfig<
      [PouchDB.Database<any>],
      Record<string, never>
    >;
    beforeAll(async () => {
      db = new PouchDB("testdb", { adapter: "memory" });
      function migrationIdToKey(name: string) {
        return `migration:${name}`;
      }
      const allMigrations: Array<
        Migration<PouchMigrationArgs> & { id: string }
      > = [
        {
          id: "1",
          up: async (db) => {
            await db.createIndex({
              index: {
                fields: ["username"],
                partial_filter_selector: {
                  type: "user",
                },
                name: "username-index",
                ddoc: "username-index",
                type: "json",
              },
            });
          },
          down: async (db) => {
            const doc = await db.get("_design/username-index");
            await db.remove(doc);
          },
        },
        {
          id: "2",
          up: async (/* db */) => {
            // TODO
          },
          down: async (/* db */) => {
            // TODO
          },
        },
        {
          id: "3",
          up: async (/* db */) => {
            // TODO
          },
          down: async (/* db */) => {
            // TODO
          },
        },
      ];
      pouchMigrationConfig = {
        async getArgs() {
          return [db];
        },
        async listMigrationIds() {
          return allMigrations.map((m) => m.id);
        },
        async loadMigration(migrationId) {
          const migration = allMigrations.find((m) => m.id === migrationId);
          if (!migration)
            throw new Error(`Migration not found: ${migrationId}`);
          return migration;
        },
        async getAllMigrationRecords() {
          const result = await db.allDocs<{
            state: MigrationState;
            migrationId: string;
          }>({
            include_docs: true,
            startkey: migrationIdToKey(""),
            endkey: migrationIdToKey("\ufff0"),
          });
          const isMigrationRecord = (doc: any): doc is MigrationRecord =>
            doc && doc.migrationId;
          return result.rows
            .map((row) => row.doc)
            .filter(isMigrationRecord) as Array<MigrationRecord>;
        },
        async initialize() {
          // No-op
        },
        async destroy() {
          // No-op
        },
        async isInitialized() {
          // No-op
          return true;
        },
        async setMigrationState(migrationId, state) {
          try {
            const doc = await db.get(migrationIdToKey(migrationId));
            await db.put({
              ...doc,
              migrationId,
              state,
            });
          } catch (err) {
            if (err.status !== 404) throw err;
            await db.put({
              _id: migrationIdToKey(migrationId),
              migrationId,
              state,
            });
          }
        },
        async deleteMigrationRecord(migrationId) {
          try {
            const doc = await db.get(migrationIdToKey(migrationId));
            await db.remove(doc);
          } catch (err) {
            if (err.status !== 404) throw err;
          }
        },
      };
    });
    describe("planning migration", () => {
      let actions: Array<Action>;
      beforeAll(async () => {
        const plan =
          createMigrationPlanner<PouchMigrationArgs, Record<string,never>>(pouchMigrationConfig);
        actions = await plan();
      });
      it("should create a static list of actions", () => {
        expect(actions).toEqual([
          {
            migrationId: "1",
            type: "up",
          },
          {
            migrationId: "2",
            type: "up",
          },
          {
            migrationId: "3",
            type: "up",
          },
        ]);
      });
    });
    describe("running the migration", () => {
      let runner: MigrationRunner;
      beforeAll(async () => {
        runner = createRunner<PouchMigrationArgs, Record<string, never>>(
          pouchMigrationConfig,
        );
        await runner.migrate();
      });
      afterAll(async () => {
        await runner.destroy?.();
      });
      it("should create the design doc for the index", async () => {
        const doc = await db.get("_design/username-index");
        expect(doc).toBeDefined();
      });
    });
  });
});
