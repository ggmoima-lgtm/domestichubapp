import { useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "./ui/sheet";
import { Button } from "./ui/button";
import { Download, Loader2 } from "lucide-react";
import InvoiceTemplate, { InvoiceTemplateData } from "./InvoiceTemplate";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoice: InvoiceTemplateData | null;
}

const InvoicePreviewSheet = ({ open, onOpenChange, invoice }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!ref.current || !invoice) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        backgroundColor: "#FFFFFF",
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const y = imgHeight < pageHeight - 40 ? 20 : 20;
      pdf.addImage(imgData, "PNG", 20, y, imgWidth, imgHeight);
      pdf.save(`${invoice.invoice_number}.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[92vh] p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b shrink-0 flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-base">Invoice Preview</SheetTitle>
          <Button
            size="sm"
            onClick={handleDownload}
            disabled={downloading || !invoice}
            className="rounded-xl"
          >
            {downloading ? (
              <Loader2 size={14} className="animate-spin mr-1" />
            ) : (
              <Download size={14} className="mr-1" />
            )}
            PDF
          </Button>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto bg-muted/40 p-4">
          {invoice && <InvoiceTemplate ref={ref} invoice={invoice} />}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default InvoicePreviewSheet;
