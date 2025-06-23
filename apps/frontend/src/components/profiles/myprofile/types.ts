import { ScopeSelectModel } from "../types";

export type ViewState = ScopeSelectModel & {
  isEditable: boolean,
  previewLanguage: string,
}