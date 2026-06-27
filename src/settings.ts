import { App, PluginSettingTab, Setting } from 'obsidian';
import type AttachmentsLibraryPlugin from './main';

export class AttachmentsLibrarySettingsTab extends PluginSettingTab {
  constructor(app: App, private plugin: AttachmentsLibraryPlugin) {
    super(app, plugin);
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl('h2', { text: 'Attachments Library — Configurações' });

    containerEl.createEl('h3', { text: 'Pastas' });

    new Setting(containerEl)
      .setName('Pasta de Anexos')
      .setDesc('Pasta monitorada. Deve coincidir com "Default location for new attachments" do Obsidian.')
      .addText(text => text
        .setPlaceholder('Attachments')
        .setValue(this.plugin.settings.attachmentsFolder)
        .onChange(async (value) => {
          this.plugin.settings.attachmentsFolder = value.trim() || 'Attachments';
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Pasta da Biblioteca')
      .setDesc('Onde as notas de metadados serão criadas.')
      .addText(text => text
        .setPlaceholder('Library')
        .setValue(this.plugin.settings.libraryFolder)
        .onChange(async (value) => {
          this.plugin.settings.libraryFolder = value.trim() || 'Library';
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Espelhar estrutura de subpastas')
      .setDesc('Se ativo, subpastas dentro de Attachments/ são replicadas em Library/.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.mirrorFolderStructure)
        .onChange(async (value) => {
          this.plugin.settings.mirrorFolderStructure = value;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('h3', { text: 'Comportamento Automático' });

    new Setting(containerEl)
      .setName('Criar nota ao adicionar arquivo')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoCreateOnNew)
        .onChange(async (value) => {
          this.plugin.settings.autoCreateOnNew = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Remover nota ao deletar arquivo')
      .setDesc('Move a nota para a lixeira do sistema (reversível).')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.autoDeleteOnRemove)
        .onChange(async (value) => {
          this.plugin.settings.autoDeleteOnRemove = value;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('h3', { text: 'Metadados de PDF' });

    new Setting(containerEl)
      .setName('Extrair metadados embutidos em PDFs')
      .setDesc('Lê title, author, subject e keywords do arquivo PDF localmente, sem internet.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enablePdfMetadataExtraction)
        .onChange(async (value) => {
          this.plugin.settings.enablePdfMetadataExtraction = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Busca online via DOI/ISBN')
      .setDesc('Consulta CrossRef (DOI) e OpenLibrary (ISBN). Gratuito, sem API key necessária.')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.enableDoiIsbnLookup)
        .onChange(async (value) => {
          this.plugin.settings.enableDoiIsbnLookup = value;
          await this.plugin.saveSettings();
        }));

    containerEl.createEl('h3', { text: 'Ações' });

    new Setting(containerEl)
      .setName('Indexar todos os arquivos existentes')
      .setDesc('Cria notas para todos os arquivos em Attachments/ que ainda não têm nota. Não sobrescreve notas existentes.')
      .addButton(btn => btn
        .setButtonText('Executar Backfill')
        .setCta()
        .onClick(() => {
          this.plugin.runBackfill();
        }));
  }
}
