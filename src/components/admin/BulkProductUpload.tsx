import React, { useState, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useCreateProduct } from '@/hooks/useAdmin';
import { useCategories } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface BulkProductUploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedProduct {
  name_bn: string;
  name_en: string;
  description_bn: string;
  description_en: string;
  price: number;
  discount_price: number | null;
  stock_quantity: number;
  category_name: string;
  is_active: boolean;
  is_featured: boolean;
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(current.trim());
        current = '';
      } else if (char === '\n' || (char === '\r' && text[i + 1] === '\n')) {
        row.push(current.trim());
        if (row.some(cell => cell !== '')) rows.push(row);
        row = [];
        current = '';
        if (char === '\r') i++;
      } else {
        current += char;
      }
    }
  }
  if (current || row.length > 0) {
    row.push(current.trim());
    if (row.some(cell => cell !== '')) rows.push(row);
  }
  return rows;
}

export default function BulkProductUpload({ open, onOpenChange }: BulkProductUploadProps) {
  const { t, language } = useLanguage();
  const { data: categories } = useCategories();
  const createProduct = useCreateProduct();
  const fileRef = useRef<HTMLInputElement>(null);

  const [parsed, setParsed] = useState<ParsedProduct[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number } | null>(null);

  const downloadTemplate = () => {
    const headers = 'name_bn,name_en,description_bn,description_en,price,discount_price,stock_quantity,category_name,is_active,is_featured';
    const example = '"নমুনা পণ্য","Sample Product","বিস্তারিত বর্ণনা","Detailed description",500,450,100,"Electronics",true,false';
    const blob = new Blob([headers + '\n' + example], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'product-upload-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error(t('শুধু CSV ফাইল গ্রহণযোগ্য', 'Only CSV files are accepted'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);

      if (rows.length < 2) {
        setErrors([t('ফাইলে কোনো ডেটা নেই', 'No data found in file')]);
        return;
      }

      const headers = rows[0].map(h => h.toLowerCase().trim());
      const dataRows = rows.slice(1);
      const products: ParsedProduct[] = [];
      const parseErrors: string[] = [];

      dataRows.forEach((row, idx) => {
        const getVal = (col: string) => {
          const i = headers.indexOf(col);
          return i >= 0 && i < row.length ? row[i] : '';
        };

        const nameBn = getVal('name_bn');
        const nameEn = getVal('name_en');
        const price = parseFloat(getVal('price'));

        if (!nameBn || !nameEn) {
          parseErrors.push(`${t('লাইন', 'Row')} ${idx + 2}: ${t('নাম খালি', 'Name is empty')}`);
          return;
        }
        if (isNaN(price) || price <= 0) {
          parseErrors.push(`${t('লাইন', 'Row')} ${idx + 2}: ${t('দাম সঠিক নয়', 'Invalid price')}`);
          return;
        }

        const dp = parseFloat(getVal('discount_price'));
        products.push({
          name_bn: nameBn,
          name_en: nameEn,
          description_bn: getVal('description_bn'),
          description_en: getVal('description_en'),
          price,
          discount_price: isNaN(dp) || dp <= 0 ? null : dp,
          stock_quantity: parseInt(getVal('stock_quantity')) || 0,
          category_name: getVal('category_name'),
          is_active: getVal('is_active')?.toLowerCase() !== 'false',
          is_featured: getVal('is_featured')?.toLowerCase() === 'true',
        });
      });

      setParsed(products);
      setErrors(parseErrors);
      setResult(null);
    };
    reader.readAsText(file);
  };

  const handleUpload = async () => {
    if (parsed.length === 0) return;
    setUploading(true);
    let success = 0;
    let failed = 0;

    for (const p of parsed) {
      try {
        // Find category by name
        const cat = categories?.find(c =>
          c.name_en.toLowerCase() === p.category_name.toLowerCase() ||
          c.name_bn === p.category_name
        );

        await createProduct.mutateAsync({
          name_bn: p.name_bn,
          name_en: p.name_en,
          description_bn: p.description_bn || null,
          description_en: p.description_en || null,
          price: p.price,
          discount_price: p.discount_price,
          stock_quantity: p.stock_quantity,
          category_id: cat?.id || null,
          is_active: p.is_active,
          is_featured: p.is_featured,
          images: [],
        });
        success++;
      } catch {
        failed++;
      }
    }

    setResult({ success, failed });
    setUploading(false);

    if (success > 0) {
      toast.success(t(`${success}টি পণ্য তৈরি হয়েছে`, `${success} products created`));
    }
    if (failed > 0) {
      toast.error(t(`${failed}টি পণ্য ব্যর্থ`, `${failed} products failed`));
    }
  };

  const handleClose = () => {
    setParsed([]);
    setErrors([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            {t('বাল্ক পণ্য আপলোড', 'Bulk Product Upload')}
          </DialogTitle>
          <DialogDescription>
            {t('CSV ফাইল থেকে একাধিক পণ্য একসাথে আপলোড করুন', 'Upload multiple products at once from a CSV file')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template */}
          <Button variant="outline" onClick={downloadTemplate} className="w-full">
            <Download className="w-4 h-4 mr-2" />
            {t('টেমপ্লেট ডাউনলোড', 'Download Template')}
          </Button>

          {/* File Input */}
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center">
            <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-3">
              {t('CSV ফাইল নির্বাচন করুন', 'Select a CSV file')}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="hidden"
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              {t('ফাইল বাছাই', 'Choose File')}
            </Button>
          </div>

          {/* Parse Errors */}
          {errors.length > 0 && (
            <div className="bg-destructive/10 rounded-lg p-3 space-y-1">
              {errors.map((err, i) => (
                <p key={i} className="text-xs text-destructive flex items-start gap-1">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  {err}
                </p>
              ))}
            </div>
          )}

          {/* Preview */}
          {parsed.length > 0 && !result && (
            <div>
              <p className="text-sm font-medium mb-2">
                {t(`${parsed.length}টি পণ্য পাওয়া গেছে`, `${parsed.length} products found`)}
              </p>
              <div className="max-h-40 overflow-y-auto border rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-secondary/50 sticky top-0">
                    <tr>
                      <th className="p-2 text-left">{t('নাম', 'Name')}</th>
                      <th className="p-2 text-right">{t('দাম', 'Price')}</th>
                      <th className="p-2 text-right">{t('স্টক', 'Stock')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {parsed.map((p, i) => (
                      <tr key={i}>
                        <td className="p-2">{language === 'bn' ? p.name_bn : p.name_en}</td>
                        <td className="p-2 text-right">৳{p.price}</td>
                        <td className="p-2 text-right">{p.stock_quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button onClick={handleUpload} disabled={uploading} className="w-full mt-4">
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {uploading
                  ? t('আপলোড হচ্ছে...', 'Uploading...')
                  : t(`${parsed.length}টি পণ্য আপলোড করুন`, `Upload ${parsed.length} Products`)
                }
              </Button>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="text-center py-4">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-primary" />
              <p className="font-medium">
                {t(`${result.success}টি সফল`, `${result.success} successful`)}
                {result.failed > 0 && `, ${t(`${result.failed}টি ব্যর্থ`, `${result.failed} failed`)}`}
              </p>
              <Button variant="outline" className="mt-3" onClick={handleClose}>
                {t('বন্ধ করুন', 'Close')}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
