# migration-fwk

> A generalized framework for conducting migrations. Works on the server (e.g. PostgreSQL) or on the client (e.g. migrating a user's local PouchDB data).

## Usage

This project provides a database-agnostic mechanism for updating and rolling back any type of schema or data set. I've used this for traditional migrations such as setting up a PostgreSQL schema, but also for local [PouchDB](https://pouchdb.com/) data and for [Shopify metaobject definitions](https://help.shopify.com/en/manual/custom-data/metaobjects).

This README gives a brief overview of the most commonly used options and methods. Read [the `pouch-poc` tests](./src/__tests__/pouch-poc.test.ts) for a complete example of how this would be used for migrating a web app's local state.

Each migration has an `up` and a `down` function. Both functions receive the same arguments; typically, this will be a reference to your database.

```ts
// example migration
export default {
  async up(db) {},
  async down(db) {},
};
```

If you need to migrate other related resources at the same time, you can also include these in your migration:

```ts
// example migration
export default {
  async up(db, redis, elasticsearch) {},
  async down(db, redis, elasticsearch) {},
};
```

These resources are defined in your migration config.

### Creating a migration config

Creating a migration runner requires you to specify how the migrations interact with your resources, as well as how migration state gets stored in the system.

**Argument management**

- `getArgs()`: This is the function that will get called to create the array of arguments passed into each migration. The most common use case will return an array with a single item: the reference to your database connection. However, you're welcome to add as many other arguments as you like.

**Migration management**
- `listMigrationIds()`: Return a Promise of a list of all migration IDs.
- `loadMigration(migrationId)`: Given a string ID of a particular migration, asynchronously load the code for that migration. If you're performing client-side migrations in a web app, this feature allows you to selectively load migrations instead of bundling all of the migration code into every page load.

**Migration state**

These methods allow you to modify how migration state is stored. The system can use the same data store as your application to track which migrations have been applied.

- `setMigrationState(migrationId, state)`: Update internally stored state for the given migration.
- `deleteMigrationRecord(migrationId)`: Remove all records of the given migration from the system.
- `getAllMigrationRecords()`: Obtain an array of all past migration runs. This is how the system determines what needs to run in order to bring the system up to date.

**Setup / teardown**

These methods allow you to perform table setup prior to migrations running. Typically, this will mean creating a `migrations` table and defining the columns.

- `initialize()`: Create the `migrations` table and define the schema.
- `isInitialized()`: Test whether the `initialize()` method has been run.
- `destroy()`: Reverse any setup performed in `initialize()`. This is typically used during testing to get your system back to a "clean slate".

### Using the `MigrationRunner`

- `migrate()`: Run all `up` migrations to get the platform to the latest state.
- `destroy()`: Run all `down` migrations to reset the platform. Typically used as cleanup after tests.
- `migrateOneUp(migrationId)`: Run a specific `up` migration.
- `migrateOneDown(migrationId)`: Run a specific `down` migration.
- `rerunOne(migrationId)`: Run a given `down` migration followed by its `up` migration. Typically used to clear out data and re-create the schema.
- `markFailed(migrationId)`: Flag the migration record as "failed". This will require manual resolution.
- `drop(migrationId)`: Remove the migration record for a specific migration. This is typically used in development after an error causes the migration to fail. The suggested workflow is to manually fix the situation, drop the record, and re-run the `up` migration.
- `listMigrationIds()`, `getAllMigrationRecords()`, `isInitialized()`, `initialize()`, `setMigrationState(migrationId, state)`: Passed through to the underlying configuration that you created.