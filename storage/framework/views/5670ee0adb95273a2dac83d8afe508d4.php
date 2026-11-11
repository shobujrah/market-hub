<?php
/** @var \Laravel\Boost\Install\GuidelineAssist $assist */
?>
# Events and notifications best practices

## Rely on event discovery

Laravel discovers listeners in the configured listener directories by inspecting type-hinted event arguments on ___SINGLE_BACKTICK___handle()___SINGLE_BACKTICK___ or ___SINGLE_BACKTICK_____invoke()___SINGLE_BACKTICK___ methods. Register listeners manually only when discovery is disabled, the listener is outside those directories, or explicit registration is clearer.

## Cache event discovery during production deployment

Cache discovered listeners during production deployment with ___SINGLE_BACKTICK___<?php echo e($assist->artisanCommand('optimize')); ?>___SINGLE_BACKTICK___ or ___SINGLE_BACKTICK___<?php echo e($assist->artisanCommand('event:cache')); ?>___SINGLE_BACKTICK___. Rebuild the cache whenever listener definitions change.

## Use ___SINGLE_BACKTICK___ShouldDispatchAfterCommit___SINGLE_BACKTICK___ inside transactions

When you dispatch an event inside a database transaction, ___SINGLE_BACKTICK___ShouldDispatchAfterCommit___SINGLE_BACKTICK___ delays dispatch until all open database transactions commit. If a transaction rolls back, Laravel discards the event. The delay affects synchronous and queued listeners. It is not limited to queue timing.

___SINGLE_BACKTICK______SINGLE_BACKTICK______SINGLE_BACKTICK___php
class OrderShipped implements ShouldDispatchAfterCommit {}
___SINGLE_BACKTICK______SINGLE_BACKTICK______SINGLE_BACKTICK___

## Queue slow notifications

Queue notifications that call external services, such as email, text messaging, or Slack, when they do not need to complete before the response. Keep a notification synchronous when immediate completion or failure feedback is part of the operation.

___SINGLE_BACKTICK______SINGLE_BACKTICK______SINGLE_BACKTICK___php
class InvoicePaid extends Notification implements ShouldQueue
{
    use Queueable;
}
___SINGLE_BACKTICK______SINGLE_BACKTICK______SINGLE_BACKTICK___

## Dispatch queued notifications after commit

A queued notification sent inside a database transaction can run before the transaction commits. Call ___SINGLE_BACKTICK___afterCommit()___SINGLE_BACKTICK___ on the queued notification, or enable the queue connection's ___SINGLE_BACKTICK___after_commit___SINGLE_BACKTICK___ option, when its delivery depends on committed data. Neither option has a scheduling effect on a synchronous notification.

___SINGLE_BACKTICK______SINGLE_BACKTICK______SINGLE_BACKTICK___php
$user->notify((new InvoicePaid($invoice))->afterCommit());
___SINGLE_BACKTICK______SINGLE_BACKTICK______SINGLE_BACKTICK___

## Route notification channels to dedicated queues

Different notification channels can have different latency and priority requirements. Implement ___SINGLE_BACKTICK___viaQueues()___SINGLE_BACKTICK___ when channels should use separate queues.

## Use on-demand notifications for non-user recipients

Avoid creating dummy models to send notifications to arbitrary addresses.

___SINGLE_BACKTICK______SINGLE_BACKTICK______SINGLE_BACKTICK___php
Notification::route('mail', 'admin@example.com')->notify(new SystemAlert());
___SINGLE_BACKTICK______SINGLE_BACKTICK______SINGLE_BACKTICK___

## Implement ___SINGLE_BACKTICK___HasLocalePreference___SINGLE_BACKTICK___ on notifiable models

Implement ___SINGLE_BACKTICK___HasLocalePreference::preferredLocale()___SINGLE_BACKTICK___ on a notifiable model when notifications and mailables should use the recipient's locale. Laravel also preserves that locale for queued delivery. An explicit ___SINGLE_BACKTICK___locale()___SINGLE_BACKTICK___ call can still override the preference for an individual notification.
<?php /**PATH G:\TASK SUBMIT TODAY CSBCSNCSNCSN\csn-ecommerce\storage\framework\views/2bcd32329febde37dcee33ff7eb38bbd.blade.php ENDPATH**/ ?>