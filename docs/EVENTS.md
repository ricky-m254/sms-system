# Optional Event Hooks

These signals provide lightweight hooks for integrations without adding infrastructure.

## Finance Events (school.events)

- `invoice_created`
  - payload: `invoice_id`, `student_id`, `term_id`, `total_amount`

- `payment_recorded`
  - payload: `payment_id`, `student_id`, `amount`, `reference_number`

- `payment_allocated`
  - payload: `allocation_id`, `payment_id`, `invoice_id`, `amount_allocated`

- `invoice_adjusted`
  - payload: `adjustment_id`, `invoice_id`, `amount`, `reason`

- `fee_assigned`
  - payload: `assignment_id`, `student_id`, `fee_structure_id`, `discount_amount`

## Module Contract Events (Optional)

These can be used later when module models are moved out of `school`.

- `academics_updated`
  - payload: `entity`, `entity_id`, `action`

- `hr_updated`
  - payload: `entity`, `entity_id`, `action`

- `staff_created`
  - payload: `staff_id`, `employee_id`

- `staff_updated`
  - payload: `staff_id`, `employee_id`

- `staff_deactivated`
  - payload: `staff_id`, `employee_id`

- `message_created`
  - payload: `message_id`, `recipient_type`, `recipient_id`

- `message_sent`
  - payload: `message_id`, `recipient_type`, `recipient_id`

- `audit_log_recorded`
  - payload: `model_name`, `object_id`, `action`

## Notes

- All signals are optional and safe to ignore.
- They are emitted by `FinanceService` after successful actions.
