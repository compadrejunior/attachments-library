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

    let baseFolderMoveFrom = this.plugin.settings.baseFolderPath;
    let baseFolderPending = this.plugin.settings.baseFolderPath;
    new Setting(containerEl)
      .setName('Pasta do arquivo base (Bases)')
      .setDesc('Pasta onde o arquivo "Attachments Library.base" será criado. Deixe em branco para a raiz do vault. Após alterar, clique em "Mover" para mover o arquivo existente.')
      .addText(text => text
        .setPlaceholder('Raiz do vault')
        .setValue(this.plugin.settings.baseFolderPath)
        .onChange(value => { baseFolderPending = value.trim(); }))
      .addButton(btn => btn
        .setButtonText('Mover')
        .onClick(async () => {
          const oldFolder = baseFolderMoveFrom;
          const newFolder = baseFolderPending;
          this.plugin.settings.baseFolderPath = newFolder;
          await this.plugin.saveSettings();
          await this.plugin.moveBaseFile(oldFolder, newFolder);
          baseFolderMoveFrom = newFolder;
          btn.setButtonText('Movido!');
          setTimeout(() => btn.setButtonText('Mover'), 3000);
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

    containerEl.createEl('h3', { text: 'Propriedade de Tags' });

    new Setting(containerEl)
      .setName('Nome da propriedade de tags')
      .setDesc('Nome do campo frontmatter usado para tags. "tags" ativa a integração nativa do Obsidian (chips coloridos). Alterar este valor não renomeia propriedades em notas existentes — use o botão abaixo.')
      .addText(text => text
        .setPlaceholder('tags')
        .setValue(this.plugin.settings.tagsPropertyName)
        .onChange(async (value) => {
          this.plugin.settings.tagsPropertyName = value.trim() || 'tags';
          await this.plugin.saveSettings();
        }));

    let migrateFromInput = '';
    new Setting(containerEl)
      .setName('Renomear propriedade em notas existentes')
      .setDesc('Renomeia um campo frontmatter em todas as notas da biblioteca, preservando os valores.')
      .addText(text => text
        .setPlaceholder('nome antigo (ex: keywords)')
        .onChange(value => { migrateFromInput = value.trim(); }))
      .addButton(btn => btn
        .setButtonText('Renomear')
        .onClick(async () => {
          if (!migrateFromInput) return;
          const newName = this.plugin.settings.tagsPropertyName;
          const count = await this.plugin.migrateTagsProperty(migrateFromInput, newName);
          btn.setButtonText(`Concluído: ${count} nota(s) migrada(s)`);
          setTimeout(() => btn.setButtonText('Renomear'), 4000);
        }));

    new Setting(containerEl)
      .setName('Sanitizar tags em notas existentes')
      .setDesc('Corrige tags inválidas nas notas da biblioteca: substitui espaços por hífens e remove caracteres não permitidos pelo Obsidian.')
      .addButton(btn => btn
        .setButtonText('Sanitizar tags')
        .onClick(async () => {
          const count = await this.plugin.sanitizeSidecarTags();
          btn.setButtonText(`Concluído: ${count} nota(s) corrigida(s)`);
          setTimeout(() => btn.setButtonText('Sanitizar tags'), 4000);
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
          void this.plugin.runBackfill();
        }));
  }
}
