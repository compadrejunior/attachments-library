export class TAbstractFile {
  path: string = '';
}

export class TFile extends TAbstractFile {
  extension: string = '';
  basename: string = '';
  name: string = '';
  stat: { ctime: number; mtime: number } = { ctime: 0, mtime: 0 };
}

export class Plugin {
  app: any = {};
  manifest: any = {};

  constructor(app?: any, manifest?: any) {
    if (app !== undefined) this.app = app;
    if (manifest !== undefined) this.manifest = manifest;
  }

  async loadData(): Promise<any> { return {}; }
  async saveData(_data: any): Promise<void> {}
  addCommand(_command: any): void {}
  addSettingTab(_tab: any): void {}
  registerEvent(_event: any): void {}
}

export class PluginSettingTab {
  containerEl: any;

  constructor(public app: any, public plugin: any) {
    this.containerEl = {
      empty: () => {},
      createEl: (_tag: string, _opts?: any) => ({
        empty: () => {},
        createEl: () => ({}),
      }),
    };
  }

  display(): void {}
  hide(): void {}
}

export class Setting {
  constructor(_containerEl: any) {}

  setName(_name: string): this { return this; }
  setDesc(_desc: string): this { return this; }

  addText(cb: (text: any) => void): this {
    const text = {
      setPlaceholder: (_v: string) => text,
      setValue: (_v: string) => text,
      onChange: (_fn: any) => text,
    };
    cb(text);
    return this;
  }

  addToggle(cb: (toggle: any) => void): this {
    const toggle = {
      setValue: (_v: boolean) => toggle,
      onChange: (_fn: any) => toggle,
    };
    cb(toggle);
    return this;
  }

  addButton(cb: (btn: any) => void): this {
    const btn = {
      setButtonText: (_v: string) => btn,
      setCta: () => btn,
      onClick: (_fn: any) => btn,
    };
    cb(btn);
    return this;
  }
}

export class Notice {
  constructor(_message: string) {}
}

export const normalizePath = (path: string): string =>
  path.replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/\/$/, '');
