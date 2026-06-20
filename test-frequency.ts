import { updateFrequencyData, getFrequencyData } from "./src/lib/scot-sheets";

async function main() {
  console.log("Testing getFrequencyData...");
  const data = await getFrequencyData();
  console.log("Data size:", data.length);

  console.log("Testing updateFrequencyData...");
  const success = await updateFrequencyData("Guddu Bhai", "5");
  console.log("Update success:", success);
}

main().catch(console.error);
