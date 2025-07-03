/**
 * Print Options Modal Component
 * Allows users to select which documents to print for an order
 * Following Instructions file standards with strict TypeScript compliance
 *
 * @domain Order Management
 * @architecture Molecule Component (Atomic Design)
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
  Grid,
  Alert,
  CircularProgress,
  Divider,
  Chip,
  useTheme,
} from '@mui/material';
import {
  Close as CloseIcon,
  Print as PrintIcon,
  Receipt as InvoiceIcon,
  Assignment as PackingIcon,
  LocalShipping as ShippingIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { Order } from '../../../services/OrderService';
import PrintService, { PrintDocumentType, PrintOptions } from '../../../services/PrintService';

/**
 * Component Props
 */
export interface PrintOptionsModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Order to print documents for */
  order: Order | null;
  /** Called when modal should close */
  onClose: () => void;
  /** Called when print is successful */
  onPrintSuccess?: () => void;
  /** Test ID for testing purposes */
  'data-testid'?: string;
}

/**
 * Document type configuration
 */
const DOCUMENT_CONFIGS = [
  {
    type: PrintDocumentType.INVOICE,
    label: 'Invoice',
    description: 'Customer billing document with itemized charges',
    icon: InvoiceIcon,
    color: 'primary' as const,
    defaultSelected: true,
  },
  {
    type: PrintDocumentType.PACKING_SLIP,
    label: 'Packing Slip',
    description: 'Warehouse picking and delivery instruction sheet',
    icon: PackingIcon,
    color: 'success' as const,
    defaultSelected: true,
  },
  {
    type: PrintDocumentType.SHIPPING_LABEL,
    label: 'Shipping Label',
    description: 'Address label for package shipping',
    icon: ShippingIcon,
    color: 'info' as const,
    defaultSelected: false,
  },
];

/**
 * Print Options Modal Component
 */
export const PrintOptionsModal: React.FC<PrintOptionsModalProps> = ({
  open,
  order,
  onClose,
  onPrintSuccess,
  'data-testid': testId = 'print-options-modal',
}) => {
  const theme = useTheme();

  // State management
  const [selectedDocuments, setSelectedDocuments] = useState<Set<PrintDocumentType>>(
    new Set([PrintDocumentType.INVOICE, PrintDocumentType.PACKING_SLIP])
  );
  const [includeLogo, setIncludeLogo] = useState(true);
  const [includeBarcode, setIncludeBarcode] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  React.useEffect(() => {
    if (open) {
      setSelectedDocuments(new Set([PrintDocumentType.INVOICE, PrintDocumentType.PACKING_SLIP]));
      setIncludeLogo(true);
      setIncludeBarcode(true);
      setPrinting(false);
      setError(null);
    }
  }, [open]);

  /**
   * Handle document type toggle
   */
  const handleDocumentToggle = useCallback((docType: PrintDocumentType) => {
    setSelectedDocuments((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(docType)) {
        newSet.delete(docType);
      } else {
        newSet.add(docType);
      }
      return newSet;
    });
  }, []);

  /**
   * Handle print operation
   */
  const handlePrint = useCallback(async () => {
    if (!order || selectedDocuments.size === 0) return;

    try {
      setPrinting(true);
      setError(null);

      const printOptions: PrintOptions = {
        documentTypes: Array.from(selectedDocuments),
        copies: 1,
        includeLogo,
        includeBarcode,
      };

      await PrintService.printOrder(order, printOptions);

      onPrintSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to print documents');
    } finally {
      setPrinting(false);
    }
  }, [order, selectedDocuments, includeLogo, includeBarcode, onPrintSuccess, onClose]);

  /**
   * Handle modal close
   */
  const handleClose = useCallback(() => {
    if (!printing) {
      onClose();
    }
  }, [printing, onClose]);

  // Don't render if no order
  if (!order) return null;

  return (
    <AnimatePresence>
      {open && (
        <Dialog
          open={open}
          onClose={handleClose}
          maxWidth='md'
          fullWidth
          data-testid={testId}
          PaperProps={{
            component: motion.div,
            initial: { opacity: 0, scale: 0.9 },
            animate: { opacity: 1, scale: 1 },
            exit: { opacity: 0, scale: 0.9 },
            transition: { duration: 0.3 },
            sx: {
              borderRadius: 2,
              maxHeight: '90vh',
            },
          }}
        >
          {/* Header */}
          <DialogTitle
            sx={{
              background: 'linear-gradient(135deg, rgba(81, 63, 242, 0.1) 0%, rgba(107, 82, 245, 0.08) 100%)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
              p: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <PrintIcon color='primary' sx={{ fontSize: 32 }} />
                <Box>
                  <Typography variant='h5' sx={{ fontWeight: 700, mb: 0.5 }}>
                    Print Order Documents
                  </Typography>
                  <Typography variant='body1' color='text.secondary'>
                    {order.orderNumber} - {order.customerName}
                  </Typography>
                </Box>
              </Box>
              <Button onClick={handleClose} disabled={printing} variant='text' sx={{ minWidth: 'auto', p: 1 }}>
                <CloseIcon />
              </Button>
            </Box>
          </DialogTitle>

          {/* Content */}
          <DialogContent sx={{ p: 3 }}>
            {error && (
              <Alert severity='error' sx={{ mb: 3 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            <Typography variant='h6' sx={{ mb: 2, fontWeight: 600 }}>
              Select Documents to Print
            </Typography>

            {/* Document Type Selection */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {DOCUMENT_CONFIGS.map((config) => {
                const Icon = config.icon;
                const isSelected = selectedDocuments.has(config.type);

                return (
                  <Grid item xs={12} md={4} key={config.type}>
                    <Card
                      variant='outlined'
                      sx={{
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        border: isSelected
                          ? `2px solid ${theme.palette[config.color].main}`
                          : '1px solid rgba(0, 0, 0, 0.12)',
                        backgroundColor: isSelected ? `${theme.palette[config.color].main}08` : 'transparent',
                        '&:hover': {
                          backgroundColor: isSelected ? `${theme.palette[config.color].main}12` : 'rgba(0, 0, 0, 0.04)',
                        },
                      }}
                      onClick={() => handleDocumentToggle(config.type)}
                    >
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
                          <Icon color={isSelected ? config.color : 'action'} sx={{ fontSize: 24, mt: 0.5 }} />
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Typography variant='subtitle1' sx={{ fontWeight: 600 }}>
                                {config.label}
                              </Typography>
                              {isSelected && (
                                <Chip label='Selected' size='small' color={config.color} variant='outlined' />
                              )}
                            </Box>
                            <Typography variant='body2' color='text.secondary'>
                              {config.description}
                            </Typography>
                          </Box>
                          <Checkbox
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleDocumentToggle(config.type);
                            }}
                            color={config.color}
                          />
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            <Divider sx={{ my: 3 }} />

            {/* Print Options */}
            <Typography variant='h6' sx={{ mb: 2, fontWeight: 600 }}>
              Print Options
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={includeLogo}
                      onChange={(e) => setIncludeLogo(e.target.checked)}
                      color='primary'
                    />
                  }
                  label='Include Company Logo'
                />
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', ml: 4 }}>
                  Add Flowlytix branding to documents
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={includeBarcode}
                      onChange={(e) => setIncludeBarcode(e.target.checked)}
                      color='primary'
                    />
                  }
                  label='Include Barcode'
                />
                <Typography variant='caption' color='text.secondary' sx={{ display: 'block', ml: 4 }}>
                  Add scannable order number barcode
                </Typography>
              </Grid>
            </Grid>

            {/* Selected Documents Summary */}
            {selectedDocuments.size > 0 && (
              <Box sx={{ mt: 3, p: 2, backgroundColor: 'rgba(25, 118, 210, 0.04)', borderRadius: 1 }}>
                <Typography variant='body2' sx={{ fontWeight: 600, mb: 1 }}>
                  Documents to Print ({selectedDocuments.size}):
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {Array.from(selectedDocuments).map((docType) => {
                    const config = DOCUMENT_CONFIGS.find((c) => c.type === docType);
                    return config ? (
                      <Chip key={docType} label={config.label} size='small' color={config.color} variant='outlined' />
                    ) : null;
                  })}
                </Box>
              </Box>
            )}
          </DialogContent>

          {/* Actions */}
          <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(0, 0, 0, 0.12)' }}>
            <Button onClick={handleClose} disabled={printing} variant='outlined'>
              Cancel
            </Button>
            <Button
              onClick={handlePrint}
              disabled={printing || selectedDocuments.size === 0}
              variant='contained'
              startIcon={printing ? <CircularProgress size={20} /> : <PrintIcon />}
              sx={{ minWidth: 140 }}
            >
              {printing
                ? 'Printing...'
                : `Print ${selectedDocuments.size} Document${selectedDocuments.size === 1 ? '' : 's'}`}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </AnimatePresence>
  );
};

export default PrintOptionsModal;
