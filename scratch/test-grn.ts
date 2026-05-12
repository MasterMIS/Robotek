import { addGRNEntry } from "../src/lib/grn-sheets";

async function test() {
  try {
    const res = await addGRNEntry({
      PO_Number: "TEST_PO",
      Qty: "10",
      Item_Name: "Test Item",
      Category: "Test Category",
      filled_by: "Test User",
      indent_id: "TEST_ID"
    });
    console.log("Success:", res);
  } catch (err) {
    console.error("Failed:", err);
  }
}

test();
