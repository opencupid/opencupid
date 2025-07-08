// FontAwesome icons
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { library } from '@fortawesome/fontawesome-svg-core'
// import { fas } from '@fortawesome/free-solid-svg-icons'
import { faGithub } from '@fortawesome/free-brands-svg-icons'
// import { far } from '@fortawesome/free-regular-svg-icons'

export function useIcons(app: any) {
  // library.add(fas)
  library.add(faGithub)
  app.component('FontAwesomeIcon', FontAwesomeIcon)
}
