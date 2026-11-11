<?php
/** @var \Laravel\Boost\Install\GuidelineAssist $assist */
?>
# Migration best practices

## Generate migrations with Artisan

Use ___SINGLE_BACKTICK___<?php echo e($assist->artisanCommand('make:migration')); ?>___SINGLE_BACKTICK___ to generate the timestamped filename and migration structure.

___SINGLE_BACKTICK______SINGLE_BACKTICK______SINGLE_BACKTICK___bash
<?php echo e($assist->artisanCommand('make:migration create_posts_table')); ?>

<?php echo e($assist->artisanCommand('make:migration add_slug_to_posts_table')); ?>

___SINGLE_BACKTICK______SINGLE_BACKTICK______SINGLE_BACKTICK___

## Define foreign-key constraints deliberately

Use ___SINGLE_BACKTICK___constrained()___SINGLE_BACKTICK___ when its naming conventions and default actions match the relationship. Specify the table or delete behavior when they do not.

___SINGLE_BACKTICK______SINGLE_BACKTICK______SINGLE_BACKTICK___php
$table->foreignId('user_id')->constrained()->cascadeOnDelete();
$table->foreignId('author_id')->constrained('users');
___SINGLE_BACKTICK______SINGLE_BACKTICK______SINGLE_BACKTICK___

Do not add a duplicate single-column index without checking the database driver's treatment of foreign-key indexes and the indexes already created by the migration.

## Treat deployed migrations as immutable

After a migration has run in a shared or production environment, create a new migration for later changes. Editing the old file makes fresh installations differ from upgraded installations.

For a local migration that has not been shared or deployed, editing and rerunning it may be simpler.

## Design indexes for real queries

Add indexes based on query patterns, selectivity, write cost, and the database's ability to use composite indexes. A column that appears in ___SINGLE_BACKTICK___WHERE___SINGLE_BACKTICK___, ___SINGLE_BACKTICK___ORDER BY___SINGLE_BACKTICK___, or ___SINGLE_BACKTICK___JOIN___SINGLE_BACKTICK___ does not automatically need its own index.

Declare each selected index in the schema migration that creates or changes the relevant table. Confirm important indexes with representative data and the database's query plan. Avoid redundant indexes whose leading columns duplicate an existing index without serving a distinct query. See the database performance and advanced query rules for index selection and column-order guidance.

## Stage changes that affect existing rows

Adding a required or unique column to a populated table often needs multiple deployment-safe steps. Add a nullable column, deploy code that can handle both states, backfill existing rows in bounded chunks, then add the required constraint or index after the data is valid.

Do not assume this migration is safe on a populated table:

___SINGLE_BACKTICK______SINGLE_BACKTICK______SINGLE_BACKTICK___php
$table->string('slug')->unique();
___SINGLE_BACKTICK______SINGLE_BACKTICK______SINGLE_BACKTICK___

Large backfills usually work better as an observable, restartable command or job than inside a schema migration. Small deterministic data changes may be reasonable in a migration when you understand their locking, transaction, and deployment behavior.

## Mirror defaults only when unsaved models need them

The database applies a default when it inserts a row, not when you instantiate a model. Mirror the value in the model's ___SINGLE_BACKTICK___$attributes___SINGLE_BACKTICK___ only when application code must observe that default before persistence, and keep both definitions in sync.

___SINGLE_BACKTICK______SINGLE_BACKTICK______SINGLE_BACKTICK___php
// Migration
$table->string('status')->default('pending');

// Model
protected $attributes = [
    'status' => 'pending',
];
___SINGLE_BACKTICK______SINGLE_BACKTICK______SINGLE_BACKTICK___

## Make rollbacks honest

Implement ___SINGLE_BACKTICK___down()___SINGLE_BACKTICK___ when you can safely reverse the change. A rollback that drops populated columns or cannot restore transformed data is destructive even if it is syntactically reversible. Document that limitation and prefer a forward-fix migration in production.

## Keep migrations focused

Keep each migration small enough to reason about, deploy, and reverse. Separate long-running backfills from schema changes when the split reduces locks and supports phased deployment. Do not split related operations only to enforce a blanket separation between data definition and data manipulation.
<?php /**PATH G:\TASK SUBMIT TODAY CSBCSNCSNCSN\csn-ecommerce\storage\framework\views/cb2d594dce4e00a3d3790facc7438ac9.blade.php ENDPATH**/ ?>