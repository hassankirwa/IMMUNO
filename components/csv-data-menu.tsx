"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FileDown, FileSpreadsheet, FileUp } from "lucide-react";

type CsvDataMenuProps = {
  onExport: () => void | Promise<void>;
  onDownloadTemplate: () => void;
  /** Called with the selected file; implement parsing and API calls in the parent. */
  onImportFile: (file: File) => void | Promise<void>;
  disabled?: boolean;
  busy?: boolean;
};

export function CsvDataMenu({
  onExport,
  onDownloadTemplate,
  onImportFile,
  disabled,
  busy,
}: CsvDataMenuProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setImporting(true);
    try {
      await onImportFile(f);
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => void handleFileChange(e)}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled || busy || importing}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Import / Export
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => void onExport()}>
            <FileDown className="mr-2 h-4 w-4" />
            Export CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDownloadTemplate}>
            <FileDown className="mr-2 h-4 w-4" />
            Download import template
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => inputRef.current?.click()}
            disabled={importing}
          >
            <FileUp className="mr-2 h-4 w-4" />
            Import CSV…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
