import {
  Form,
  ActionPanel,
  Action,
  showToast,
  Toast,
  useNavigation,
  Icon,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { initDatabase, getAllPacks, createPack, PackRecord } from "./lib/db";
import {
  importFromClipboard,
  importFromUrl,
  importFromFile,
} from "./lib/import";

type ImportMethod = "clipboard" | "url" | "file";

export default function AddSticker() {
  const { pop } = useNavigation();
  const [packs, setPacks] = useState<PackRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [importMethod, setImportMethod] = useState<ImportMethod>("clipboard");
  const [packId, setPackId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form field errors
  const [urlError, setUrlError] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        const allPacks = await getAllPacks();
        setPacks(allPacks);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load packs",
          message: String(error),
        });
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  async function handleSubmit(values: {
    url?: string;
    file?: string[];
    packId?: string;
    newPackName?: string;
    newPackIcon?: string;
  }) {
    // Validation
    if (importMethod === "url" && !values.url?.trim()) {
      setUrlError("URL is required");
      return;
    }

    setIsSubmitting(true);

    try {
      // Handle new pack creation
      let packId: string | null =
        values.packId === "__new__" ? null : (values.packId ?? null);

      if (values.packId === "__new__" && values.newPackName?.trim()) {
        packId = await createPack(
          values.newPackName.trim(),
          values.newPackIcon?.trim() || null,
        );
        await showToast({
          style: Toast.Style.Success,
          title: `Created pack "${values.newPackName.trim()}"`,
        });
      }

      if (packId === "") packId = null;

      const importOptions = { packId };

      let result: import("./lib/import").ImportResult | undefined;

      await showToast({
        style: Toast.Style.Animated,
        title: "AI is analyzing sticker...",
      });

      switch (importMethod) {
        case "clipboard":
          result = await importFromClipboard(importOptions);
          break;
        case "url":
          result = await importFromUrl(values.url!, importOptions);
          break;
        case "file": {
          if (!values.file || values.file.length === 0) {
            throw new Error("Please select a file");
          }
          result = await importFromFile(values.file[0], importOptions);
          break;
        }
      }

      if (!result) {
        throw new Error("No import method selected");
      }

      if (result.isDuplicate) {
        await showToast({
          style: Toast.Style.Success,
          title: "Duplicate detected",
          message: `This sticker already exists as "${result.existingSticker?.name}"`,
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "Sticker added!",
          message: `Added to your vault`,
        });
      }

      pop();
    } catch (error) {
      console.error("Import failed:", error);
      const errMsg = error instanceof Error ? error.message : String(error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Import failed",
        message: errMsg,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form
      isLoading={isLoading || isSubmitting}
      navigationTitle="Add Sticker"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Add Sticker"
            icon={Icon.Plus}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="importMethod"
        title="Import From"
        value={importMethod}
        onChange={(value) => setImportMethod(value as ImportMethod)}
      >
        <Form.Dropdown.Item
          value="clipboard"
          title="Clipboard"
          icon={Icon.Clipboard}
        />
        <Form.Dropdown.Item value="url" title="Image URL" icon={Icon.Link} />
        <Form.Dropdown.Item
          value="file"
          title="Local File"
          icon={Icon.Finder}
        />
      </Form.Dropdown>

      {importMethod === "clipboard" && (
        <Form.Description
          title="Source"
          text="The image currently on your clipboard will be imported. Copy an image from the web, WhatsApp, or any app first."
        />
      )}

      {importMethod === "url" && (
        <Form.TextField
          id="url"
          title="Image URL"
          placeholder="https://example.com/sticker.png"
          error={urlError}
          onChange={() => setUrlError(undefined)}
        />
      )}

      {importMethod === "file" && (
        <Form.FilePicker
          id="file"
          title="Select Image"
          allowMultipleSelection={false}
          canChooseDirectories={false}
          canChooseFiles={true}
        />
      )}

      <Form.Separator />

      <Form.Dropdown
        id="packId"
        title="Pack (Optional)"
        value={packId}
        onChange={setPackId}
      >
        <Form.Dropdown.Item value="" title="No Pack" icon={Icon.Minus} />
        {packs.map((pack) => (
          <Form.Dropdown.Item
            key={pack.id}
            value={pack.id}
            title={`${pack.icon ? pack.icon + " " : ""}${pack.name}`}
          />
        ))}
        <Form.Dropdown.Item
          value="__new__"
          title="Create New Pack..."
          icon={Icon.PlusCircle}
        />
      </Form.Dropdown>

      {packId === "__new__" && (
        <>
          <Form.TextField
            id="newPackName"
            title="New Pack Name"
            placeholder="Reactions"
          />

          <Form.TextField
            id="newPackIcon"
            title="New Pack Icon"
            placeholder="e.g. icon name or emoji"
          />
        </>
      )}
    </Form>
  );
}
