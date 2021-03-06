/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import * as nls from 'vs/nls';
import * as errors from 'vs/base/common/errors';
import * as env from 'vs/base/common/platform';
import * as DOM from 'vs/base/browser/dom';
import { TPromise } from 'vs/base/common/winjs.base';
import { IAction } from 'vs/base/common/actions';
import { Button } from 'vs/base/browser/ui/button/button';
import { $, Builder } from 'vs/base/browser/builder';
import { IActionItem } from 'vs/base/browser/ui/actionbar/actionbar';
import { IViewletViewOptions } from 'vs/workbench/browser/parts/views/viewsViewlet';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { OpenFolderAction, OpenFileFolderAction, AddRootFolderAction } from 'vs/workbench/browser/actions/workspaceActions';
import { attachButtonStyler } from 'vs/platform/theme/common/styler';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IKeybindingService } from 'vs/platform/keybinding/common/keybinding';
import { IContextMenuService } from 'vs/platform/contextview/browser/contextView';
import { IWorkspaceContextService, WorkbenchState } from 'vs/platform/workspace/common/workspace';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IWorkspaceEditingService } from 'vs/workbench/services/workspace/common/workspaceEditing';
import { IFileService } from 'vs/platform/files/common/files';
import URI from 'vs/base/common/uri';
import { ViewletPanel, IViewletPanelOptions } from 'vs/workbench/browser/parts/views/panelViewlet';

export class EmptyView extends ViewletPanel {

	public static readonly ID: string = 'workbench.explorer.emptyView';
	public static readonly NAME = nls.localize('noWorkspace', "No Folder Opened");

	private button: Button;
	private messageDiv: Builder;
	private titleDiv: Builder;

	constructor(
		options: IViewletViewOptions,
		@IThemeService private themeService: IThemeService,
		@IInstantiationService private instantiationService: IInstantiationService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IWorkspaceContextService private contextService: IWorkspaceContextService,
		@IConfigurationService configurationService: IConfigurationService,
		@IWorkspaceEditingService private workspaceEditingService: IWorkspaceEditingService,
		@IFileService private fileService: IFileService,
	) {
		super({ ...(options as IViewletPanelOptions), ariaHeaderLabel: nls.localize('explorerSection', "Files Explorer Section") }, keybindingService, contextMenuService, configurationService);
		this.contextService.onDidChangeWorkbenchState(() => this.setLabels());
	}

	public renderHeader(container: HTMLElement): void {
		this.titleDiv = $('span').text(name).appendTo($('div.title').appendTo(container));
	}

	protected renderBody(container: HTMLElement): void {
		DOM.addClass(container, 'explorer-empty-view');

		this.messageDiv = $('p').appendTo($('div.section').appendTo(container));

		let section = $('div.section').appendTo(container);

		this.button = new Button(section.getHTMLElement());
		attachButtonStyler(this.button, this.themeService);

		this.disposables.push(this.button.onDidClick(() => {
			const actionClass = this.contextService.getWorkbenchState() === WorkbenchState.WORKSPACE ? AddRootFolderAction : env.isMacintosh ? OpenFileFolderAction : OpenFolderAction;
			const action = this.instantiationService.createInstance<string, string, IAction>(actionClass, actionClass.ID, actionClass.LABEL);
			this.actionRunner.run(action).done(() => {
				action.dispose();
			}, err => {
				action.dispose();
				errors.onUnexpectedError(err);
			});
		}));

		this.disposables.push(DOM.addDisposableListener(container, DOM.EventType.DROP, (e: DragEvent) => {
			const resources: URI[] = [];
			for (let i = 0; i < e.dataTransfer.files.length; i++) {
				resources.push(URI.file(e.dataTransfer.files.item(i).path));
			}

			this.fileService.resolveFiles(resources.map(r => ({ resource: r }))).then(stats => {
				const dirs = stats.filter(s => s.success && s.stat.isDirectory);
				return this.workspaceEditingService.addFolders(dirs.map(d => ({ uri: d.stat.resource })));
			}).done(undefined, errors.onUnexpectedError);
		}));

		this.setLabels();
	}

	private setLabels(): void {
		if (this.contextService.getWorkbenchState() === WorkbenchState.WORKSPACE) {
			this.messageDiv.text(nls.localize('noWorkspaceHelp', "You have not yet added a folder to the workspace."));
			if (this.button) {
				this.button.label = nls.localize('addFolder', "Add Folder");
			}
			this.titleDiv.text(this.contextService.getWorkspace().name);
		} else {
			this.messageDiv.text(nls.localize('noFolderHelp', "You have not yet opened a folder."));
			if (this.button) {
				this.button.label = nls.localize('openFolder', "Open Folder");
			}
			this.titleDiv.text(this.title);
		}
	}

	layoutBody(size: number): void {
		// no-op
	}

	public setVisible(visible: boolean): TPromise<void> {
		return TPromise.as(null);
	}

	public focusBody(): void {
		if (this.button) {
			this.button.element.focus();
		}
	}

	protected reveal(element: any, relativeTop?: number): TPromise<void> {
		return TPromise.as(null);
	}

	public getActions(): IAction[] {
		return [];
	}

	public getSecondaryActions(): IAction[] {
		return [];
	}

	public getActionItem(action: IAction): IActionItem {
		return null;
	}

	public shutdown(): void {
		// Subclass to implement
	}
}
