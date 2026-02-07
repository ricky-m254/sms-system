import { Link, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import SettingsField from '../../components/settings/SettingsField'
import { settingsSchemas } from '../../settings'
import { hasPermission, useCurrentUser } from '../../settings/permissions'
import { useModuleSettings } from '../../settings/useModuleSettings'

export default function ModuleSettingsPage() {
  const params = useParams<{ module: string }>()
  const moduleKey = params.module?.toLowerCase() ?? 'global'
  const schema = settingsSchemas[moduleKey]
  const user = useCurrentUser()
  const [showRestricted, setShowRestricted] = useState(false)
  const canDebugPermissions = hasPermission(user, 'settings:debug')
  const debugStorageKey = 'settings:debug_show_hidden'

  const { values, setValue, reset, storageKey } = useModuleSettings(moduleKey)

  useEffect(() => {
    if (!canDebugPermissions) {
      setShowRestricted(false)
      return
    }
    try {
      const stored = localStorage.getItem(debugStorageKey)
      setShowRestricted(stored === 'true')
    } catch {
      setShowRestricted(false)
    }
  }, [canDebugPermissions])

  useEffect(() => {
    if (!canDebugPermissions) return
    try {
      localStorage.setItem(debugStorageKey, String(showRestricted))
    } catch {
      // ignore
    }
  }, [canDebugPermissions, showRestricted])

  if (!schema) {
    return (
      <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-6">
        <h1 className="text-lg font-display font-semibold text-rose-200">
          Settings module not found
        </h1>
        <p className="mt-2 text-sm text-rose-200">
          The requested settings page does not exist. Choose one of the available modules
          below.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {Object.keys(settingsSchemas).map((key) => (
            <Link
              key={key}
              className="rounded-full border border-rose-400/40 px-3 py-1 text-xs text-rose-200"
              to={`/settings/${key}`}
            >
              {settingsSchemas[key].title}
            </Link>
          ))}
        </div>
      </div>
    )
  }

  const visibleSettings = schema.settings.filter((setting) => {
    if (showRestricted) return true
    return hasPermission(user, setting.requiredPermission)
  })

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
          {schema.module} settings
        </p>
        <h1 className="mt-2 text-2xl font-display font-semibold">{schema.title}</h1>
        {schema.description ? (
          <p className="mt-2 text-sm text-slate-400">{schema.description}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-400">
          <span className="rounded-full border border-slate-700 px-3 py-1">
            Auto-saved locally
          </span>
          <span className="rounded-full border border-slate-700 px-3 py-1">
            Storage: {storageKey}
          </span>
          {canDebugPermissions ? (
            <button
              type="button"
              onClick={() => setShowRestricted((prev) => !prev)}
              className={`rounded-full border px-3 py-1 transition ${
                showRestricted
                  ? 'border-emerald-400/60 text-emerald-200'
                  : 'border-slate-700 text-slate-300 hover:border-slate-500'
              }`}
            >
              {showRestricted ? 'Hide restricted fields' : 'Show restricted fields'}
            </button>
          ) : null}
        </div>
      </header>

      <section className="grid grid-cols-12 gap-4">
        {visibleSettings.length === 0 ? (
          <div className="col-span-12 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
            <p className="text-sm text-slate-300">
              No settings are visible with the current permissions.
            </p>
          </div>
        ) : null}

        {visibleSettings.map((setting) => {
          const isRestricted =
            Boolean(setting.requiredPermission) &&
            !hasPermission(user, setting.requiredPermission) &&
            showRestricted
          return (
            <SettingsField
              key={setting.key}
              definition={setting}
              value={values[setting.key] ?? setting.defaultValue}
              onChange={(nextValue) => setValue(setting.key, nextValue)}
              isRestricted={isRestricted}
            />
          )
        })}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
        <div>
          <p className="text-sm font-semibold text-slate-100">Reset to defaults</p>
          <p className="mt-1 text-xs text-slate-400">
            Restore the schema default values for this module.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-400"
        >
          Reset module settings
        </button>
      </div>
    </div>
  )
}
