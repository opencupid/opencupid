/**
 * Map the icon component names used throughout the application to their
 * corresponding SVG file paths under `@/assets/icons`.
 */
export const doodleIconPaths = {
  IconSun: 'interface/sun',
  IconMail: 'interface/mail',
  IconMessage: 'interface/message',
  IconPhone: 'interface/phone',
  IconTick: 'interface/tick',
  IconLogin: 'interface/login',
  IconArrowSingleLeft: 'arrows/arrow-single-left',
  IconMenuDotsVert: 'interface/menu-dots-vert',
  IconPen: 'interface/pen',
  IconSearch: 'interface/search',
  IconSetting2: 'interface/setting-2',
  IconUser: 'interface/user',
  IconLogout: 'interface/logout',
  IconGlobe: 'interface/globe',
  IconMic: 'interface/mic',
  IconMic2: 'interface/mic-2',
  IconArrowLeft: 'arrows/arrow-left',
  IconCamera2: 'interface/camera',
  IconPhoto: 'interface/photo',
  IconCross: 'interface/cross',
} as const

export type DoodleIconName = keyof typeof doodleIconPaths

const iconModules = import.meta.glob('../assets/icons/**/*.svg')

/** Dynamically import an icon by its component name. */
export async function loadIcon(name: DoodleIconName) {
  const importer = iconModules[`../assets/icons/${doodleIconPaths[name]}.svg`]
  if (!importer) {
    throw new Error(`Icon not found: ${name}`)
  }
  return await (importer as () => Promise<any>)()
}
