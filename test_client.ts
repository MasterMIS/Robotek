import { generateClient } from 'aws-amplify/data';
import { Amplify } from 'aws-amplify';
import outputs from './amplify_outputs.json';
import { Schema } from './amplify/data/resource';

Amplify.configure(outputs);
const client = generateClient<Schema>({ authMode: 'apiKey' });

async function test() {
  console.log("Locally checking Models available in Amplify Client...");
  console.log("Model Keys:", Object.keys(client.models));

  // Try to test O2DRecord
  if (client.models.O2DRecord) {
    console.log("O2DRecord IS DEFINED in client.models!");
  } else {
    console.log("O2DRecord IS UNDEFINED!");
  }
}

test();
