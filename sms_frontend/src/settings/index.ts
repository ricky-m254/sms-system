import type { SettingsSchema } from './types'
import globalSettings from './schemas/global'
import financeSettings from './schemas/finance'
import studentSettings from './schemas/students'
import parentSettings from './schemas/parents'
import academicsSettings from './schemas/academics'
import staffSettings from './schemas/staff'

export const settingsSchemas: Record<string, SettingsSchema> = {
  global: globalSettings,
  finance: financeSettings,
  students: studentSettings,
  parents: parentSettings,
  academics: academicsSettings,
  staff: staffSettings,
}

export const settingsSidebar = [
  { key: 'global', label: 'Global Settings' },
  { key: 'finance', label: 'Finance Settings' },
  { key: 'students', label: 'Student Settings' },
  { key: 'parents', label: 'Parent Settings' },
  { key: 'academics', label: 'Academics Settings' },
  { key: 'staff', label: 'Staff Settings' },
]
