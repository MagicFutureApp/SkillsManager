import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import React from "react";

type DataTableProps = React.ComponentProps<typeof Table> & {
  containerClassName?: string;
};

export const DataTable = ({ className, containerClassName, ...props }: DataTableProps) => {
  return (
    <section
      className={cn("overflow-hidden rounded-xl border border-border bg-card", containerClassName)}
    >
      <Table className={cn("table-fixed", className)} {...props} />
    </section>
  );
};

export const DataTableHeader = TableHeader;
export const DataTableBody = TableBody;
export const DataTableFooter = TableFooter;

export const DataTableHead = ({ className, ...props }: React.ComponentProps<typeof TableHead>) => {
  return (
    <TableHead
      className={cn(
        "h-auto bg-muted/40 px-4 py-3 text-xs font-semibold text-muted-foreground",
        className
      )}
      {...props}
    />
  );
};

export const DataTableCell = ({ className, ...props }: React.ComponentProps<typeof TableCell>) => {
  return <TableCell className={cn("px-4 py-3 align-middle", className)} {...props} />;
};

type DataTableRowProps = React.ComponentProps<typeof TableRow> & {
  selected?: boolean;
};

export const DataTableRow = ({ className, selected, ...props }: DataTableRowProps) => {
  return (
    <TableRow
      aria-selected={selected}
      data-state={selected ? "selected" : undefined}
      className={cn(
        "transition-colors hover:bg-muted/30 data-[state=selected]:bg-primary/5 data-[state=selected]:[&>td:first-child]:shadow-[inset_3px_0_0_theme(colors.primary)]",
        className
      )}
      {...props}
    />
  );
};

export const DataTableEmptyRow = ({
  children,
  colSpan
}: {
  children: React.ReactNode;
  colSpan: number;
}) => {
  return (
    <TableRow>
      <DataTableCell
        colSpan={colSpan}
        className="px-4 py-9 text-center text-sm text-muted-foreground"
      >
        {children}
      </DataTableCell>
    </TableRow>
  );
};
