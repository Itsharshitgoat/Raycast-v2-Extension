/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** Grid Size - How large to display sticker thumbnails */
  "gridSize": "small" | "medium" | "large",
  /** Local AI Tagging - Uses your local Ollama instance to analyze and tag stickers instead of Raycast AI. */
  "useOllama": boolean,
  /** Ollama Model - The vision model to use in Ollama (e.g. llava, llava:34b, llama3.2-vision) */
  "ollamaModel": string
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `browse-stickers` command */
  export type BrowseStickers = ExtensionPreferences & {}
  /** Preferences accessible in the `add-sticker` command */
  export type AddSticker = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `browse-stickers` command */
  export type BrowseStickers = {}
  /** Arguments passed to the `add-sticker` command */
  export type AddSticker = {}
}

