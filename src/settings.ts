import { App, PluginSettingTab, Setting } from 'obsidian';
import type AttachmentsLibraryPlugin from './main';
import { t } from './i18n/i18n';

export class AttachmentsLibrarySettingsTab extends PluginSettingTab {
  constructor(app: App, private plugin: AttachmentsLibraryPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl).setName(t('settings.heading')).setHeading();

    new Setting(containerEl).setName(t('settings.sections.folders')).setHeading();

    new Setting(containerEl)
      .setName(t('settings.attachmentsFolder.name'))
      .setDesc(t('settings.attachmentsFolder.desc'))
      .addText(text => text
        .setPlaceholder(t('settings.attachmentsFolder.placeholder'))
        .setValue(this.plugin.settings.attachmentsFolder)
        .onChange(async (value) => {
          this.plugin.settings.attachmentsFolder = value.trim() || 'Attachments';
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(t('settings.libraryFolder.name'))
      .setDesc(t('settings.libraryFolder.desc'))
      .addText(text => text
        .setPlaceholder(t('settings.libraryFolder.placeholder'))
        .setValue(this.plugin.settings.libraryFolder)
        .onChange(async (value) => {
          this.plugin.settings.libraryFolder = value.trim() || 'Library';
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(t('settings.mirrorStructure.name'))
      .setDesc(t('settings.mirrorStructure.desc'))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.mirrorFolderStructure)
        .onChange(async (value) => {
          this.plugin.settings.mirrorFolderStructure = value;
          await this.plugin.saveSettings();
        }));

    let baseFolderMoveFrom = this.plugin.settings.baseFolderPath;
    let baseFolderPending = this.plugin.settings.baseFolderPath;
    new Setting(containerEl)
      .setName(t('settings.baseFolder.name'))
      .setDesc(t('settings.baseFolder.desc'))
      .addText(text => text
        .setPlaceholder(t('settings.baseFolder.placeholder'))
        .setValue(this.plugin.settings.baseFolderPath)
        .onChange(value => { baseFolderPending = value.trim(); }))
      .addButton(btn => btn
        .setButtonText(t('settings.baseFolder.moveBtn'))
        .onClick(async () => {
          const oldFolder = baseFolderMoveFrom;
          const newFolder = baseFolderPending;
          this.plugin.settings.baseFolderPath = newFolder;
          await this.plugin.saveSettings();
          await this.plugin.moveBaseFile(oldFolder, newFolder);
          baseFolderMoveFrom = newFolder;
          btn.setButtonText(t('settings.baseFolder.movedBtn'));
          window.setTimeout(() => btn.setButtonText(t('settings.baseFolder.moveBtn')), 3000);
        }));

    new Setting(containerEl).setName(t('settings.sections.behavior')).setHeading();

    new Setting(containerEl)
      .setName(t('settings.autoCreate.name'))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoCreateOnNew)
        .onChange(async (value) => {
          this.plugin.settings.autoCreateOnNew = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(t('settings.autoDelete.name'))
      .setDesc(t('settings.autoDelete.desc'))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoDeleteOnRemove)
        .onChange(async (value) => {
          this.plugin.settings.autoDeleteOnRemove = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl).setName(t('settings.sections.tagsProperty')).setHeading();

    new Setting(containerEl)
      .setName(t('settings.tagsPropertyName.name'))
      .setDesc(t('settings.tagsPropertyName.desc'))
      .addText(text => text
        .setPlaceholder(t('settings.tagsPropertyName.placeholder'))
        .setValue(this.plugin.settings.tagsPropertyName)
        .onChange(async (value) => {
          this.plugin.settings.tagsPropertyName = value.trim() || 'tags';
          await this.plugin.saveSettings();
        }));

    let migrateFromInput = '';
    new Setting(containerEl)
      .setName(t('settings.migrateTags.name'))
      .setDesc(t('settings.migrateTags.desc'))
      .addText(text => text
        .setPlaceholder(t('settings.migrateTags.placeholder'))
        .onChange(value => { migrateFromInput = value.trim(); }))
      .addButton(btn => btn
        .setButtonText(t('settings.migrateTags.renameBtn'))
        .onClick(async () => {
          if (!migrateFromInput) return;
          const newName = this.plugin.settings.tagsPropertyName;
          const count = await this.plugin.migrateTagsProperty(migrateFromInput, newName);
          btn.setButtonText(t('settings.migrateTags.doneBtn', { count }));
          window.setTimeout(() => btn.setButtonText(t('settings.migrateTags.renameBtn')), 4000);
        }));

    new Setting(containerEl)
      .setName(t('settings.sanitizeTags.name'))
      .setDesc(t('settings.sanitizeTags.desc'))
      .addButton(btn => btn
        .setButtonText(t('settings.sanitizeTags.btn'))
        .onClick(async () => {
          const count = await this.plugin.sanitizeSidecarTags();
          btn.setButtonText(t('settings.sanitizeTags.doneBtn', { count }));
          window.setTimeout(() => btn.setButtonText(t('settings.sanitizeTags.btn')), 4000);
        }));

    new Setting(containerEl).setName(t('settings.sections.pdfMetadata')).setHeading();

    new Setting(containerEl)
      .setName(t('settings.pdfExtraction.name'))
      .setDesc(t('settings.pdfExtraction.desc'))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enablePdfMetadataExtraction)
        .onChange(async (value) => {
          this.plugin.settings.enablePdfMetadataExtraction = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName(t('settings.doiLookup.name'))
      .setDesc(t('settings.doiLookup.desc'))
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableDoiIsbnLookup)
        .onChange(async (value) => {
          this.plugin.settings.enableDoiIsbnLookup = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl).setName(t('settings.sections.actions')).setHeading();

    new Setting(containerEl)
      .setName(t('settings.backfill.name'))
      .setDesc(t('settings.backfill.desc'))
      .addButton(btn => btn
        .setButtonText(t('settings.backfill.btn'))
        .setCta()
        .onClick(() => {
          void this.plugin.runBackfill();
        }));
  }
}
