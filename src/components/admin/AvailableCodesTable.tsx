import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import type { NFCCode } from '@/pages/AdminDashboard';
import QRCode from 'qrcode';
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AvailableCodesTableProps {
  codes: NFCCode[];
  onDownloadCSV: () => void;
}

const AvailableCodesTable = ({ codes, onDownloadCSV }: AvailableCodesTableProps) => {
  // Filter out both assigned and hidden codes
  const availableCodes = codes
    .filter(code => !code.assigned_to && !code.is_hidden)
    .slice(0, 10);

  const handleQRDownload = async (url: string) => {
    try {
      const qrSvg = await QRCode.toString(url, {
        type: 'svg',
        margin: 1,
        width: 300
      });

      const blob = new Blob([qrSvg], { type: 'image/svg+xml' });
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `qr-code-${url.split('/').pop()}.svg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleHideToggle = async (code: NFCCode) => {
    try {
      console.log('Toggling hide for code:', code.id, 'Current value:', code.is_hidden);
      const { error } = await supabase
        .from('nfc_codes')
        .update({ is_hidden: !code.is_hidden })
        .eq('id', code.id);

      if (error) throw error;
      
      toast.success(`Code ${code.is_hidden ? 'unhidden' : 'hidden'} successfully`);
    } catch (error) {
      console.error('Error updating code visibility:', error);
      toast.error('Failed to update code visibility');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Available Codes</h3>
        <Button onClick={onDownloadCSV} variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Download CSV
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>QR</TableHead>
            <TableHead>Hide</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {availableCodes.map((code) => (
            <TableRow key={code.id}>
              <TableCell className="font-mono">
                <a 
                  href={`/c/${code.code}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline"
                >
                  {code.code}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleQRDownload(`${window.location.origin}/c/${code.code}`)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download QR
                </Button>
              </TableCell>
              <TableCell>
                <Switch
                  checked={code.is_hidden || false}
                  onCheckedChange={() => handleHideToggle(code)}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default AvailableCodesTable;