import type { PolymorpherData } from "../automatedPolymorpherModels";
import API from "../api";
import { PolymorpherFlags } from "../automatedPolymorpherModels";
import CONSTANTS from "../constants";
import { PolymorpherManager } from "../polymorphermanager";
import type { ActorData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/module.mjs";

// =============================
// Module Generic function
// =============================

export function isGMConnected(): boolean {
	return Array.from(<Users>game.users).find((user) => user.isGM && user.active) ? true : false;
}

export function wait(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

// export let debugEnabled = 0;
// 0 = none, warnings = 1, debug = 2, all = 3

export function debug(msg, args = "") {
	if (game.settings.get(CONSTANTS.MODULE_NAME, "debug")) {
		console.log(`DEBUG | ${CONSTANTS.MODULE_NAME} | ${msg}`, args);
	}
	return msg;
}

export function log(message) {
	message = `${CONSTANTS.MODULE_NAME} | ${message}`;
	console.log(message.replace("<br>", "\n"));
	return message;
}

export function notify(message) {
	message = `${CONSTANTS.MODULE_NAME} | ${message}`;
	ui.notifications?.notify(message);
	console.log(message.replace("<br>", "\n"));
	return message;
}

export function info(info, notify = false) {
	info = `${CONSTANTS.MODULE_NAME} | ${info}`;
	if (notify) ui.notifications?.info(info);
	console.log(info.replace("<br>", "\n"));
	return info;
}

export function warn(warning, notify = false) {
	warning = `${CONSTANTS.MODULE_NAME} | ${warning}`;
	if (notify) ui.notifications?.warn(warning);
	console.warn(warning.replace("<br>", "\n"));
	return warning;
}

export function error(error, notify = true) {
	error = `${CONSTANTS.MODULE_NAME} | ${error}`;
	if (notify) ui.notifications?.error(error);
	return new Error(error.replace("<br>", "\n"));
}

export function timelog(message): void {
	warn(Date.now(), message);
}

export const i18n = (key: string): string => {
	return game.i18n.localize(key)?.trim();
};

export const i18nFormat = (key: string, data = {}): string => {
	return game.i18n.format(key, data)?.trim();
};

// export const setDebugLevel = (debugText: string): void => {
//   debugEnabled = { none: 0, warn: 1, debug: 2, all: 3 }[debugText] || 0;
//   // 0 = none, warnings = 1, debug = 2, all = 3
//   if (debugEnabled >= 3) CONFIG.debug.hooks = true;
// };

export function dialogWarning(message, icon = "fas fa-exclamation-triangle") {
	return `<p class="${CONSTANTS.MODULE_NAME}-dialog">
          <i style="font-size:3rem;" class="${icon}"></i><br><br>
          <strong style="font-size:1.2rem;">${CONSTANTS.MODULE_NAME}</strong>
          <br><br>${message}
      </p>`;
}

export function cleanUpString(stringToCleanUp: string) {
	// regex expression to match all non-alphanumeric characters in string
	const regex = /[^A-Za-z0-9]/g;
	if (stringToCleanUp) {
		return i18n(stringToCleanUp).replace(regex, "").toLowerCase();
	} else {
		return stringToCleanUp;
	}
}

export function isStringEquals(stringToCheck1: string, stringToCheck2: string, startsWith = false): boolean {
	if (stringToCheck1 && stringToCheck2) {
		if (startsWith) {
			return cleanUpString(stringToCheck1).startsWith(cleanUpString(stringToCheck2));
		} else {
			return cleanUpString(stringToCheck1) === cleanUpString(stringToCheck2);
		}
	} else {
		return stringToCheck1 === stringToCheck2;
	}
}

// =========================================================================================

/**
 * Called when a token is right clicked on to display the HUD.
 * Adds a button with a icon, and adds a slash on top of it if it is already active.
 * @param {Object} app - the application data
 * @param {Object} html - the html data
 * @param {Object} hudToken - The HUD Data
 */
export async function renderAutomatedPolymorpherHud(app, html, hudToken) {
	// if only one token is selected
	// if (canvas.tokens?.controlled.length == 1) {
	const sourceToken = <Token>canvas.tokens?.placeables.find((t: Token) => {
		return t.id === hudToken._id;
	});
	if (!sourceToken || !sourceToken.isOwner) {
		return;
	}

	const actor = retrieveActorFromToken(sourceToken);
	if (!actor) {
		// warn(`No actor founded on canvas with token '${sourceToken.id}'`, true);
		return;
	}

	const listPolymorphers: PolymorpherData[] =
		// actor &&
		// (<boolean>actor.getFlag(CONSTANTS.MODULE_NAME, PolymorpherFlags.IS_LOCAL) ||
		//   game.settings.get(CONSTANTS.MODULE_NAME, PolymorpherFlags.STORE_ON_ACTOR))
		//   ? <PolymorpherData[]>actor.getFlag(CONSTANTS.MODULE_NAME, PolymorpherFlags.POLYMORPHERS) || []
		//   : <PolymorpherData[]>game.user?.getFlag(CONSTANTS.MODULE_NAME, PolymorpherFlags.POLYMORPHERS) || [];
		<PolymorpherData[]>actor?.getFlag(CONSTANTS.MODULE_NAME, PolymorpherFlags.POLYMORPHERS) || [];

	if (listPolymorphers.length > 0) {
		//addToRevertPolymorphButton(html, sourceToken);
		addToPolymorphButton(html, sourceToken);
		// } else {
		//   // Do not show anything
		// }
	}
}

function addToPolymorphButton(html, sourceToken: Token) {
	if (!sourceToken || !sourceToken.isOwner) {
		return;
	}

	const button = buildButton(html, `Transform ${sourceToken.name}`);
	// if (isPolymorphed) {
	//   button = addSlash(button);
	// }

	const sourceActor = retrieveActorFromToken(sourceToken);
	if (!sourceActor) {
		warn(`No actor founded on canvas with token '${sourceToken.id}'`);
		return;
	}

	const random = <boolean>sourceActor?.getFlag(CONSTANTS.MODULE_NAME, PolymorpherFlags.RANDOM) ?? false;
	const ordered = <boolean>sourceActor?.getFlag(CONSTANTS.MODULE_NAME, PolymorpherFlags.ORDERED) ?? false;
	// const storeonactor = <boolean>actor?.getFlag(CONSTANTS.MODULE_NAME, PolymorpherFlags.STORE_ON_ACTOR) ?? false;

	button.find("i").on("click", async (ev) => {
		for (const targetToken of <Token[]>canvas.tokens?.controlled) {
			const targetActor = retrieveActorFromToken(targetToken);
			if (targetActor) {
				API._invokePolymorpherManagerInner(targetToken, targetActor, false, ordered, random, undefined);
			}
		}
	});
	button.find("i").on("contextmenu", async (ev) => {
		for (const targetToken of <Token[]>canvas.tokens?.controlled) {
			// Do somethign with right click
			const targetActor = retrieveActorFromToken(targetToken);
			if (targetActor) {
				API._invokePolymorpherManagerInner(targetToken, targetActor, true, ordered, random, undefined);
			}
		}
	});
}

function buildButton(html, tooltip) {
	const iconClass = "fas fa-wind"; // TODO customize icon ???
	const button = $(
		`<div class="control-icon ${CONSTANTS.MODULE_NAME}" title="${tooltip}"><i class="${iconClass}"></i></div>`
	);
	const settingHudColClass = <string>game.settings.get(CONSTANTS.MODULE_NAME, "hudColumn") ?? "left";
	const settingHudTopBottomClass = <string>game.settings.get(CONSTANTS.MODULE_NAME, "hudTopBottom") ?? "top";

	const buttonPos = "." + settingHudColClass.toLowerCase();

	const col = html.find(buttonPos);
	if (settingHudTopBottomClass.toLowerCase() === "top") {
		col.prepend(button);
	} else {
		col.append(button);
	}
	return button;
}

// /**
//  * Adds the hud button to the HUD HTML
//  * @param {object} html - The HTML
//  * @param {object} data - The data
//  * @param {boolean} hasSlash - If true, the slash will be placed over the icon
//  */
// async function addButton(html, data, hasSlash = false) {
//   const button = $(`<div class="control-icon ${CONSTANTS.MODULE_NAME}"><i class="fas ${SettingsForm.getIconClass()}"></i></div>`);

//   if (hasSlash) {
//     this.addSlash(button);
//   }

//   const col = html.find(SettingsForm.getHudColumnClass());
//   if (SettingsForm.getHudTopBottomClass() == 'top') {
//     col.prepend(button);
//   } else {
//     col.append(button);
//   }

//   button.find('i').on('click', async (ev) => {
//     // do something
//     if (hasSlash) {
//       removeSlash(button);
//     } else {
//       addSlash(button);
//     }
//   });
// }

/**
 * Adds a slash icon on top of the icon to signify is active
 * @param {Object} button - The HUD button to add a slash on top of
 */
function addSlash(button) {
	const slash = $(`<i class="fas fa-slash" style="position: absolute; color: tomato"></i>`);
	button.addClass("fa-stack");
	button.find("i").addClass("fa-stack-1x");
	slash.addClass("fa-stack-1x");
	button.append(slash);
	return button;
}

/**
 * Removes the slash icon from the button to signify that it is no longer active
 * @param {Object} button - The button
 */
function removeSlash(button) {
	const slash = button.find("i")[1];
	slash.remove();
}

export function retrieveActorFromToken(sourceToken: Token): Actor | undefined {
	if (!sourceToken.actor) {
		return undefined;
	}
	// const storeOnActorFlag = <boolean>sourceToken.actor.getFlag(CONSTANTS.MODULE_NAME, PolymorpherFlags.STORE_ON_ACTOR);
	// if (!storeOnActorFlag) {
	//   return sourceToken.actor;
	// }
	let actor: Actor | undefined = undefined;
	if (sourceToken.data.actorLink) {
		actor = <Actor>game.actors?.get(<string>sourceToken.data.actorId);
	}
	// DO NOT NEED THIS
	// if(!actor){
	//   actor = <Actor>game.actors?.get(<string>sourceToken.actor?.id);
	// }
	if (!actor) {
		actor = sourceToken.actor;
	}
	return actor;
}

export async function retrieveActorFromData(
	aId: string,
	aName: string,
	currentCompendium: string
): Promise<Actor | null> {
	let actorToTransformLi: Actor | null = null;
	if (currentCompendium && currentCompendium != "none" && currentCompendium != "nonenodelete") {
		const pack = game.packs.get(currentCompendium);
		if (pack) {
			await pack.getIndex();
			/*
      for (const entityComp of pack.index) {
        const actorComp = <Actor>await pack.getDocument(entityComp._id);
        if (actorComp.id === aId || actorComp.name === aName) {
          actorToTransformLi = actorComp;
          break;
        }
      }
      */
			// If the actor is found in the index, return it by exact ID
			if (pack.index.get(aId)) {
				actorToTransformLi = <Actor>await pack.getDocument(aId);
			}
			// If not found, search for the actor by name
			if (!actorToTransformLi) {
				for (const entityComp of pack.index) {
					const actorComp = <StoredDocument<Actor>>await pack.getDocument(entityComp._id);
					if (actorComp.id === aId || actorComp.name === aName) {
						actorToTransformLi = actorComp;
						break;
					}
				}
			}
		}
	}
	if (!actorToTransformLi) {
		actorToTransformLi = <Actor>game.actors?.contents.find((a) => {
			return a.id === aId || a.name === aName;
		});
	}
	return actorToTransformLi;
}

/* returns the actor data sans ALL embedded collections */
export function _getRootActorData(actorDoc: Actor) {
	const actorData = actorDoc.data.toObject();

	/* get the key NAME of the embedded document type.
	 * ex. not 'ActiveEffect' (the class name), 'effect' the collection's field name
	 */
	//@ts-ignore
	const embeddedFields = Object.values(Actor.implementation.metadata.embedded).map(
		//@ts-ignore
		(thisClass) => thisClass.metadata.collection
	);

	/* delete any embedded fields from the actor data */
	embeddedFields.forEach((field) => {
		delete actorData[field];
	});

	return actorData;
}

// TODO TO INTEGRATE FOR TRANSFER
export function transferItemsActor(
	sourceActor: Actor,
	targetActor: Actor,
	originalItemId: string,
	createdItem: Item,
	originalQuantity: number,
	transferedQuantity: number,
	stackItems: boolean
) {
	const originalItem = sourceActor?.items.get(originalItemId);
	if (originalItem == undefined) {
		console.error("Could not find the source item", originalItemId);
		return;
	}

	if (transferedQuantity > 0 && transferedQuantity <= originalQuantity) {
		const newOriginalQuantity = originalQuantity - transferedQuantity;
		let stacked = false; // will be true if a stack of item has been found and items have been stacked in it
		if (stackItems) {
			const potentialStacks = <Item[]>(
				targetActor?.data.items.filter(
					(i) =>
						i.name == originalItem.name && diffObject(createdItem, i) && i.data._id !== createdItem.data._id
				)
			);
			if (potentialStacks.length >= 1) {
				//@ts-ignore
				const newQuantity = <number>potentialStacks[0].data.data.quantity + transferedQuantity;
				potentialStacks[0]?.update({ "data.quantity": newQuantity });
				// deleteItemIfZero(targetSheet, <string>createdItem.data._id);
				stacked = true;
			}
		}

		originalItem.update({ "data.quantity": newOriginalQuantity }).then((i: Item | undefined) => {
			if (i) {
				const sh = <FormApplication<FormApplicationOptions, FormApplication.Data<{}, FormApplicationOptions>>>(
					i.actor?.sheet
				);
				//@ts-ignore
				deleteItemIfZero(<ActorSheet>sh, <string>i.data._id);
			}
		});
		if (stacked === false) {
			//@ts-ignore
			createdItem.data.data.quantity = transferedQuantity;
			targetActor?.createEmbeddedDocuments("Item", [<any>createdItem.data]);
		}
	} else {
		error("could not transfer " + transferedQuantity + " items", true);
	}
}

export async function transferPermissionsActor(sourceActor: Actor, targetActor: Actor): Promise<Actor> {
	// let sourceActor = //actor to copy the permissions from
	// let targetActor = //actor to copy the permissions to

	// The important part is the {diff:false, recursive: false},
	// which ensures that any undefined parts of the permissions object
	// are not filled in by the existing permissions on the target actor

	// For a straight duplicate of permissions, you should be able to just do:
	return <Actor>(
		await targetActor.update({ permission: _getHandPermission(sourceActor) }, { diff: false, recursive: false })
	);
}

//this method is on the actor, so "this" is the actor document
function _getHandPermission(actor: Actor) {
	const handPermission = <any>duplicate(actor.data.permission);
	for (const key of Object.keys(handPermission)) {
		//remove any permissions that are not owner
		if (handPermission[key] < CONST.DOCUMENT_PERMISSION_LEVELS.OWNER) {
			delete handPermission[key];
		}
		//set default permission to none/limited/observer
		handPermission.default = CONST.DOCUMENT_PERMISSION_LEVELS.NONE; // CONST.DOCUMENT_PERMISSION_LEVELS.OBSERVER
	}
	return handPermission;
}
