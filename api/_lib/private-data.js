// SERVER-ONLY. Files and folders under api/ that start with "_" are never
// deployed as routable Vercel Functions and are never served as static
// assets — only other function files can `require`/`import` them. Nothing
// in this file is ever sent to the browser.
//
// This is where commercially sensitive fields live: supplier landed cost,
// margin notes, supplier contact details. The public catalogue
// (data/products.json) never contains any of this.
//
// Every value below is null / "not yet sourced" — no supplier relationship
// exists yet for any SKU, so there is nothing real to record. This module
// exists to define the correct shape and storage boundary for when that
// changes, not to imply costing work has been done.

const PRIVATE_PRODUCT_DATA = {
  'ASC-CBLCLIP-01': { landedCostGBP: null, supplierName: null, supplierContact: null, marginNotes: null },
  'ASC-CBLBOX-01': { landedCostGBP: null, supplierName: null, supplierContact: null, marginNotes: null },
  'ASC-PACKCUBE-01': { landedCostGBP: null, supplierName: null, supplierContact: null, marginNotes: null },
  'ASC-DRWORG-01': { landedCostGBP: null, supplierName: null, supplierContact: null, marginNotes: null },
  'ASC-SINKRACK-01': { landedCostGBP: null, supplierName: null, supplierContact: null, marginNotes: null },
  'ASC-SINKCADDY-01': { landedCostGBP: null, supplierName: null, supplierContact: null, marginNotes: null },
  'ASC-BRMHOLD-01': { landedCostGBP: null, supplierName: null, supplierContact: null, marginNotes: null },
  'ASC-WRDORG-01': { landedCostGBP: null, supplierName: null, supplierContact: null, marginNotes: null },
};

function getPrivateDataForSku(sku) {
  return PRIVATE_PRODUCT_DATA[sku] || null;
}

module.exports = { PRIVATE_PRODUCT_DATA, getPrivateDataForSku };
