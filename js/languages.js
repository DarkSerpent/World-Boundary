"use strict";

class LanguagesPage extends ListPage {
	constructor () {
		const sourceFilter = SourceFilter.getInstance();
		const typeFilter = new Filter({header: "Type", items: ["standard", "exotic", "secret"], itemSortFn: null, displayFn: StrUtil.uppercaseFirst});
		const scriptFilter = new Filter({header: "Script", displayFn: StrUtil.uppercaseFirst});
		const miscFilter = new Filter({header: "Miscellaneous", items: ["Has Fonts", "SRD"]});

		super({
			dataSource: "data/languages.json",

			filters: [
				sourceFilter,
				typeFilter,
				scriptFilter,
				miscFilter
			],
			filterSource: sourceFilter,

			listClass: "languages",

			sublistClass: "sublanguages",

			dataProps: ["language"]
		});

		this._sourceFilter = sourceFilter;
		this._scriptFilter = scriptFilter;
	}

	getListItem (it, anI, isExcluded) {
		it._fMisc = it.fonts ? ["Has Fonts"] : [];
		if (it.srd) it._fMisc.push("SRD");

		if (!isExcluded) {
			// populate filters
			this._sourceFilter.addItem(it.source);
			this._scriptFilter.addItem(it.script);
		}

		const eleLi = document.createElement("li");
		eleLi.className = `row ${isExcluded ? "row--blacklisted" : ""}`;

		const source = Parser.sourceJsonToAbv(it.source);
		const hash = UrlUtil.autoEncodeHash(it);

		eleLi.innerHTML = `<a href="#${hash}" class="lst--border">
			<span class="col-6 bold pl-0">${it.name}</span>
			<span class="col-2 text-center">${(it.type || "\u2014").uppercaseFirst()}</span>
			<span class="col-2 text-center">${(it.script || "\u2014").toTitleCase()}</span>
			<span class="col-2 text-center ${Parser.sourceJsonToColor(it.source)} pr-0" title="${Parser.sourceJsonToFull(it.source)}" ${BrewUtil.sourceJsonToStyle(it.source)}>${source}</span>
		</a>`;

		const listItem = new ListItem(
			anI,
			eleLi,
			it.name,
			{
				hash,
				source,
				dialects: it.dialects || [],
				type: it.type || "",
				script: it.script || ""
			},
			{
				uniqueId: it.uniqueId ? it.uniqueId : anI,
				isExcluded
			}
		);

		eleLi.addEventListener("click", (evt) => this._list.doSelect(listItem, evt));
		eleLi.addEventListener("contextmenu", (evt) => ListUtil.openContextMenu(evt, this._list, listItem));

		return listItem;
	}

	handleFilterChange () {
		const f = this._filterBox.getValues();
		this._list.filter(li => {
			const it = this._dataList[li.ix];
			return this._filterBox.toDisplay(
				f,
				it.source,
				it.type,
				it.script,
				it._fMisc
			);
		});
		FilterBox.selectFirstVisible(this._dataList);
	}

	getSublistItem (it, pinId) {
		const hash = UrlUtil.autoEncodeHash(it);

		const $ele = $(`<li class="row">
			<a href="#${hash}" class="lst--border">
				<span class="bold col-8 pl-0">${it.name}</span>
				<span class="col-2 text-center">${(it.type || "\u2014").uppercaseFirst()}</span>
				<span class="col-2 text-center pr-0">${(it.script || "\u2014").toTitleCase()}</span>
			</a>
		</li>`)
			.contextmenu(evt => ListUtil.openSubContextMenu(evt, listItem));

		const listItem = new ListItem(
			pinId,
			$ele,
			it.name,
			{
				hash,
				type: it.type || "",
				script: it.script || ""
			}
		);
		return listItem;
	}

	doLoadHash (id) {
		const $content = $("#pagecontent").empty();
		const it = this._dataList[id];

		function buildStatsTab () {
			$content.append(RenderLanguages.$getRenderedLanguage(it));
		}

		function buildFluffTab (isImageTab) {
			return Renderer.utils.pBuildFluffTab({
				isImageTab,
				$content,
				entity: it,
				fnFluffBuilder: (fluffJson) => it.fluff || fluffJson.languageFluff.find(l => it.name === l.name && it.source === l.source),
				fluffUrl: `data/fluff-languages.json`
			});
		}

		const statTab = Renderer.utils.tabButton(
			"Traits",
			() => {},
			buildStatsTab
		);
		const picTab = Renderer.utils.tabButton(
			"Images",
			() => {},
			buildFluffTab.bind(null, true)
		);
		const fontTab = Renderer.utils.tabButton(
			"Fonts",
			() => {},
			() => {
				$content.append(Renderer.utils.getBorderTr());
				$content.append(Renderer.utils.getNameTr(it));
				const $td = $(`<td colspan="6" class="text"/>`);
				$$`<tr class="text">${$td}</tr>`.appendTo($content);
				$content.append(Renderer.utils.getBorderTr());

				if (!it.fonts) {
					$td.append("<i>No fonts available.</i>");
					return;
				}

				const $styleFont = $(`<style/>`);

				let lastStyleIndex = null;
				let lastStyleClass = null;
				const renderStyle = (ix) => {
					if (ix === lastStyleIndex) return;

					const font = it.fonts[ix];
					const slugName = Parser.stringToSlug(font.split("/").last().split(".")[0]);

					const styleClass = `languages__sample--${slugName}`;

					$styleFont.empty().append(`
						@font-face { font-family: ${slugName}; src: url('${font}'); }
						.${styleClass} { font-family: ${slugName}, sans-serif; }
					`);

					if (lastStyleClass) $ptOutput.removeClass(lastStyleClass);
					lastStyleClass = styleClass;
					$ptOutput.addClass(styleClass);
					lastStyleIndex = ix;
				};

				const saveTextDebounced = MiscUtil.debounce((text) => StorageUtil.pSetForPage("sampleText", text), 500);
				const updateText = (val) => {
					if (val === undefined) val = $iptSample.val();
					else $iptSample.val(val);
					$ptOutput.text(val);
					saveTextDebounced(val);
				};

				const DEFAULT_TEXT = "The big quick brown flumph jumped over the lazy dire xorn";

				const $iptSample = $(`<textarea class="form-control w-100 mr-2 resize-vertical font-ui mb-2" style="height: 110px">${DEFAULT_TEXT}</textarea>`)
					.keyup(() => updateText())
					.change(() => updateText());

				const $selFont = it.fonts.length === 1
					? null
					: $(`<select class="form-control font-ui languages__sel-sample input-xs">${it.fonts.map((f, i) => `<option value="${i}">${f.split("/").last().split(".")[0]}</option>`).join("")}</select>`)
						.change(() => {
							const ix = Number($selFont.val());
							renderStyle(ix);
						});

				const $ptOutput = $(`<pre class="languages__sample p-2 mb-0">${DEFAULT_TEXT}</pre>`);

				renderStyle(0);

				StorageUtil.pGetForPage("sampleText")
					.then(val => {
						if (val != null) updateText(val);
					});

				$$`<div class="flex-col w-100">
					${$styleFont}
					${$selFont ? $$`<label class="flex-v-center mb-2"><div class="mr-2">Font:</div>${$selFont}</div>` : ""}
					${$iptSample}
					${$ptOutput}
					<hr class="hr-4">
					<h5 class="mb-2 mt-0">Downloads</h5>
					<ul class="pl-5 mb-0">
						${it.fonts.map(f => `<li><a href="${f}" target="_blank">${f.split("/").last()}</a></li>`).join("")}
					</ul>
				</div>`.appendTo($td);
			}
		);

		Renderer.utils.bindTabButtons(statTab, picTab, fontTab);

		ListUtil.updateSelected();
	}

	async pDoLoadSubHash (sub) {
		sub = this._filterBox.setFromSubHashes(sub);
		await ListUtil.pSetFromSubHashes(sub);
	}
}

const languagesPage = new LanguagesPage();
window.addEventListener("load", () => languagesPage.pOnLoad());
