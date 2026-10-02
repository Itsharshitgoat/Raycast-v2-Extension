import {
  Grid,
  ActionPanel,
  Action,
  Clipboard,
  showToast,
  Toast,
  Icon,
  Color,
  confirmAlert,
  Alert,
  getPreferenceValues,
  showHUD,
  Form,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect, useCallback, useMemo } from "react";
import Fuse from "fuse.js";
import {
  initDatabase,
  getAllStickers,
  getAllPacks,
  getTagsForSticker,
  getKeywordsForSticker,
  updateSticker,
  deleteStickerById,
  incrementUseCount,
  addTagsToSticker,
  removeTagFromSticker,
  setKeywords,
  StickerRecord,
  PackRecord,
  TagRecord,
} from "./lib/db";
import {
  getImagePath,
  deleteImage,
  ensureSquareThumbnail,
} from "./lib/file-system";
import { buildSearchKeywords } from "./lib/search";
import { analyzeStickerWithAI } from "./lib/ai";

interface Preferences {
  gridSize: "small" | "medium" | "large";
}

const GRID_COLUMNS: Record<string, number> = {
  small: 8,
  medium: 5,
  large: 3,
};

interface EnrichedSticker extends StickerRecord {
  tags: TagRecord[];
  keywordsList: string[];
  packName?: string;
  searchKeywords: string[];
  displayPath: string;
}

function AddTagForm({
  stickerId,
  onDone,
}: {
  stickerId: string;
  onDone: () => void;
}) {
  const { pop } = useNavigation();

  async function handleSubmit(values: { tags: string }) {
    const tagNames = values.tags
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);

    if (tagNames.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Please enter at least one tag",
      });
      return;
    }

    try {
      await addTagsToSticker(stickerId, tagNames);
      await showToast({
        style: Toast.Style.Success,
        title: `Added ${tagNames.length} tag${tagNames.length > 1 ? "s" : ""}`,
      });
      onDone();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add tags",
        message: String(error),
      });
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Tags"
            icon={Icon.Tag}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="tags"
        title="Tags"
        placeholder="e.g. cat, angry, meme, funny"
        info="Separate multiple tags with commas"
      />
    </Form>
  );
}

export default function BrowseStickers() {
  const [stickers, setStickers] = useState<EnrichedSticker[]>([]);
  const [packs, setPacks] = useState<PackRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPack, setSelectedPack] = useState("all");
  const [searchText, setSearchText] = useState("");

  const preferences = getPreferenceValues<Preferences>();
  const columns = GRID_COLUMNS[preferences.gridSize] ?? 5;

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      await initDatabase();

      const [allStickers, allPacks] = await Promise.all([
        getAllStickers(),
        getAllPacks(),
      ]);

      const packMap = new Map(allPacks.map((p) => [p.id, p.name]));

      const enriched: EnrichedSticker[] = await Promise.all(
        allStickers.map(async (sticker) => {
          const [tags, keywordsList, displayPath] = await Promise.all([
            getTagsForSticker(sticker.id),
            getKeywordsForSticker(sticker.id),
            ensureSquareThumbnail(
              sticker.filename,
              sticker.width,
              sticker.height,
            ),
          ]);
          const packName = sticker.pack_id
            ? (packMap.get(sticker.pack_id) ?? undefined)
            : undefined;
          const searchKeywords = buildSearchKeywords(
            {
              name: sticker.name,
              source: sticker.source,
              format: sticker.format,
              pack_name: packName,
              source_url: sticker.source_url,
            },
            tags.map((t) => t.name),
            keywordsList,
          );
          return {
            ...sticker,
            tags,
            keywordsList,
            packName,
            searchKeywords,
            displayPath,
          };
        }),
      );

      setStickers(enriched);
      setPacks(allPacks);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to load stickers",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- Handlers ---

  const handleCopySticker = useCallback(
    async (sticker: EnrichedSticker) => {
      try {
        const imagePath = getImagePath(sticker.filename);
        await Clipboard.copy({ file: imagePath });
        await incrementUseCount(sticker.id);
        await showHUD(`Copied "${sticker.name}"`);
        await loadData();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to copy",
          message: String(error),
        });
      }
    },
    [loadData],
  );

  const handlePasteSticker = useCallback(
    async (sticker: EnrichedSticker) => {
      try {
        const imagePath = getImagePath(sticker.filename);
        await Clipboard.paste({ file: imagePath });
        await incrementUseCount(sticker.id);
        await loadData();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to paste",
          message: String(error),
        });
      }
    },
    [loadData],
  );

  const handleToggleFavorite = useCallback(
    async (sticker: EnrichedSticker) => {
      try {
        const newVal = sticker.is_favorite === 1 ? 0 : 1;
        await updateSticker(sticker.id, { is_favorite: newVal });
        await showToast({
          style: Toast.Style.Success,
          title: newVal === 1 ? "Added to favorites" : "Removed from favorites",
        });
        await loadData();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to update",
          message: String(error),
        });
      }
    },
    [loadData],
  );

  const handleDeleteSticker = useCallback(
    async (sticker: EnrichedSticker) => {
      const confirmed = await confirmAlert({
        title: "Delete Sticker",
        message: `Are you sure you want to delete "${sticker.name}"? This cannot be undone.`,
        primaryAction: {
          title: "Delete",
          style: Alert.ActionStyle.Destructive,
        },
      });

      if (!confirmed) return;

      try {
        await deleteStickerById(sticker.id);
        await deleteImage(sticker.filename);
        await showToast({
          style: Toast.Style.Success,
          title: "Sticker deleted",
        });
        await loadData();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete",
          message: String(error),
        });
      }
    },
    [loadData],
  );

  const handleMoveSticker = useCallback(
    async (sticker: EnrichedSticker, packId: string | null) => {
      try {
        await updateSticker(sticker.id, { pack_id: packId });
        await showToast({
          style: Toast.Style.Success,
          title: packId ? "Moved to pack" : "Removed from pack",
        });
        await loadData();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to move",
          message: String(error),
        });
      }
    },
    [loadData],
  );

  const handleReanalyze = useCallback(
    async (sticker: EnrichedSticker) => {
      try {
        await showToast({
          style: Toast.Style.Animated,
          title: "Re-analyzing sticker with AI...",
        });
        const imagePath = getImagePath(sticker.filename);
        const aiData = await analyzeStickerWithAI(imagePath);
        await updateSticker(sticker.id, { name: aiData.name });
        if (aiData.tags && aiData.tags.length > 0) {
          await addTagsToSticker(sticker.id, aiData.tags);
        }
        if (aiData.keywords && aiData.keywords.length > 0) {
          await setKeywords(sticker.id, aiData.keywords);
        }
        await showToast({
          style: Toast.Style.Success,
          title: `Updated "${aiData.name}" with ${aiData.tags.length} tags`,
        });
        await loadData();
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "AI analysis failed",
          message: String(error),
        });
      }
    },
    [loadData],
  );

  // --- Filtering ---

  const filteredStickers =
    selectedPack === "all"
      ? stickers
      : selectedPack === "favorites"
        ? stickers.filter((s) => s.is_favorite === 1)
        : selectedPack === "uncategorized"
          ? stickers.filter((s) => !s.pack_id)
          : stickers.filter((s) => s.pack_id === selectedPack);

  const searchedStickers = useMemo(() => {
    if (!searchText.trim()) return filteredStickers;

    const fuse = new Fuse(filteredStickers, {
      keys: [
        { name: "name", weight: 2.0 },
        { name: "packName", weight: 1.0 },
        { name: "searchKeywords", weight: 1.5 },
      ],
      threshold: 0.2, // Stricter threshold for better accuracy
      ignoreLocation: true,
      useExtendedSearch: true,
    });

    // By default, Fuse extended search treats space-separated words as an OR search.
    // To make it an AND search (where all words must match), we prefix each word with `'`
    // which is the "includes-match" operator in Fuse.js extended search.
    const searchTerms = searchText.trim().split(/\s+/);
    const andQuery = searchTerms.map((term) => `'${term}`).join(" ");

    const results = fuse.search(andQuery);
    return results.map((r) => r.item);
  }, [filteredStickers, searchText]);

  // --- Sections ---

  const favorites = searchedStickers.filter((s) => s.is_favorite === 1);
  const nonFavorites = searchedStickers.filter((s) => s.is_favorite !== 1);

  // Group non-favorites by pack
  const byPack = new Map<string, EnrichedSticker[]>();
  const uncategorized: EnrichedSticker[] = [];

  for (const s of nonFavorites) {
    if (s.pack_id && s.packName) {
      const existing = byPack.get(s.pack_id) ?? [];
      existing.push(s);
      byPack.set(s.pack_id, existing);
    } else {
      uncategorized.push(s);
    }
  }

  // Sort favorites by use_count desc
  favorites.sort((a, b) => b.use_count - a.use_count);

  // --- Action Panel ---

  function StickerActions({ sticker }: { sticker: EnrichedSticker }) {
    return (
      <ActionPanel>
        <ActionPanel.Section title="Use">
          <Action
            title="Paste to Active App"
            icon={Icon.Document}
            onAction={() => handlePasteSticker(sticker)}
          />
          <Action
            title="Copy to Clipboard"
            icon={Icon.Clipboard}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={() => handleCopySticker(sticker)}
          />
          <Action.CopyToClipboard
            title="Copy File Path"
            content={getImagePath(sticker.filename)}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
        </ActionPanel.Section>

        <ActionPanel.Section title="Organize">
          <Action
            title={
              sticker.is_favorite === 1
                ? "Remove from Favorites"
                : "Add to Favorites"
            }
            icon={sticker.is_favorite === 1 ? Icon.StarDisabled : Icon.Star}
            shortcut={{ modifiers: ["cmd"], key: "f" }}
            onAction={() => handleToggleFavorite(sticker)}
          />
          <ActionPanel.Submenu
            title="Edit Tags"
            icon={Icon.Tag}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          >
            <Action
              title="Add Tag…"
              icon={Icon.Plus}
              onAction={async () => {
                // Prompt-less: use a simple approach — add from clipboard or show instructions
                await showToast({
                  style: Toast.Style.Animated,
                  title: "Enter tag name...",
                });
                // We use Raycast's built-in Form for this via Action.Push
              }}
            />
            {sticker.tags.length > 0 ? (
              sticker.tags.map((tag) => (
                <Action
                  key={tag.id}
                  title={`Remove "${tag.name}"`}
                  icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
                  onAction={async () => {
                    await removeTagFromSticker(sticker.id, tag.id);
                    await loadData();
                    await showToast({
                      style: Toast.Style.Success,
                      title: `Removed tag "${tag.name}"`,
                    });
                  }}
                />
              ))
            ) : (
              <Action title="No Tags Yet" icon={Icon.Tag} onAction={() => {}} />
            )}
          </ActionPanel.Submenu>
          <Action.Push
            title="Add Tags"
            icon={Icon.PlusCircle}
            shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
            target={<AddTagForm stickerId={sticker.id} onDone={loadData} />}
          />
          <Action
            title="Re-analyze with AI"
            icon={Icon.Wand}
            shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
            onAction={() => handleReanalyze(sticker)}
          />
          {packs.length > 0 && (
            <ActionPanel.Submenu
              title="Move to Pack"
              icon={Icon.Folder}
              shortcut={{ modifiers: ["cmd"], key: "m" }}
            >
              <Action
                title="No Pack"
                icon={Icon.XMarkCircle}
                onAction={() => handleMoveSticker(sticker, null)}
              />
              {packs.map((pack) => (
                <Action
                  key={pack.id}
                  title={`${pack.icon ? pack.icon + " " : ""}${pack.name}`}
                  onAction={() => handleMoveSticker(sticker, pack.id)}
                />
              ))}
            </ActionPanel.Submenu>
          )}
        </ActionPanel.Section>

        <ActionPanel.Section title="Other">
          <Action.ShowInFinder
            title="Show in Finder"
            path={getImagePath(sticker.filename)}
            shortcut={{ modifiers: ["cmd"], key: "o" }}
          />
          <Action
            title="Delete Sticker"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            shortcut={{ modifiers: ["ctrl"], key: "x" }}
            onAction={() => handleDeleteSticker(sticker)}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={loadData}
          />
        </ActionPanel.Section>
      </ActionPanel>
    );
  }

  // --- Render ---

  const showSections = selectedPack === "all" && !searchText.trim();

  return (
    <Grid
      columns={columns}
      inset={Grid.Inset.Zero}
      fit={Grid.Fit.Fill}
      isLoading={isLoading}
      filtering={false}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search stickers by name, tag, or emoji..."
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Filter by pack"
          storeValue={true}
          onChange={setSelectedPack}
        >
          <Grid.Dropdown.Item
            title="All Stickers"
            value="all"
            icon={Icon.AppWindowGrid3x3}
          />
          <Grid.Dropdown.Item
            title="Favorites"
            value="favorites"
            icon={Icon.Star}
          />
          <Grid.Dropdown.Item
            title="Uncategorized"
            value="uncategorized"
            icon={Icon.Tray}
          />
          {packs.length > 0 && (
            <Grid.Dropdown.Section title="Packs">
              {packs.map((pack) => (
                <Grid.Dropdown.Item
                  key={pack.id}
                  title={`${pack.icon ? pack.icon + " " : ""}${pack.name}`}
                  value={pack.id}
                />
              ))}
            </Grid.Dropdown.Section>
          )}
        </Grid.Dropdown>
      }
    >
      {stickers.length === 0 && !isLoading ? (
        <Grid.EmptyView
          icon={{ source: Icon.Image, tintColor: Color.Purple }}
          title="No Stickers Yet"
          description={`Your sticker vault is empty...!`}
        />
      ) : showSections ? (
        <>
          {favorites.length > 0 && (
            <Grid.Section
              title="Favorites"
              columns={columns}
              fit={Grid.Fit.Fill}
            >
              {favorites.map((sticker) => (
                <Grid.Item
                  key={sticker.id}
                  content={{
                    value: sticker.displayPath,
                    tooltip: sticker.name,
                  }}
                  keywords={sticker.searchKeywords}
                  actions={<StickerActions sticker={sticker} />}
                />
              ))}
            </Grid.Section>
          )}
          {Array.from(byPack.entries()).map(([packId, packStickers]) => {
            const pack = packs.find((p) => p.id === packId);
            return (
              <Grid.Section
                key={packId}
                title={`${pack?.icon ? pack?.icon + " " : ""}${pack?.name ?? "Unknown Pack"}`}
                columns={columns}
                fit={Grid.Fit.Fill}
              >
                {packStickers.map((sticker) => (
                  <Grid.Item
                    key={sticker.id}
                    content={{
                      value: sticker.displayPath,
                      tooltip: sticker.name,
                    }}
                    keywords={sticker.searchKeywords}
                    actions={<StickerActions sticker={sticker} />}
                  />
                ))}
              </Grid.Section>
            );
          })}
          {uncategorized.length > 0 && (
            <Grid.Section
              title="Uncategorized"
              columns={columns}
              fit={Grid.Fit.Fill}
            >
              {uncategorized.map((sticker) => (
                <Grid.Item
                  key={sticker.id}
                  content={{
                    value: sticker.displayPath,
                    tooltip: sticker.name,
                  }}
                  keywords={sticker.searchKeywords}
                  actions={<StickerActions sticker={sticker} />}
                />
              ))}
            </Grid.Section>
          )}
        </>
      ) : (
        searchedStickers.map((sticker) => (
          <Grid.Item
            key={sticker.id}
            content={{
              value: sticker.displayPath,
              tooltip: sticker.name,
            }}
            keywords={sticker.searchKeywords}
            actions={<StickerActions sticker={sticker} />}
          />
        ))
      )}
    </Grid>
  );
}
