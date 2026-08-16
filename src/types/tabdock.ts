export type Section = {
  id: string;
  name: string;
  icon: string;
  order: number;
  collapsed: boolean;
};

export type StoredLink = {
  id: string;
  sectionId: string;
  url: string;
  title: string;
  favIconUrl?: string;
  order: number;
  createdAt: number;
  lastOpenedAt?: number;
};

export type PanelSide = "left" | "right";

export type TabDockState = {
  version: 1;
  sections: Section[];
  links: StoredLink[];
  panelSide?: PanelSide;
};

export type RuntimeTabInfo = {
  isOpen: boolean;
  tabId?: number;
  windowId?: number;
  tabIndex?: number;
};

export type ToastTone = "info" | "error";

export type ToastMessage = {
  id: number;
  text: string;
  tone: ToastTone;
};
