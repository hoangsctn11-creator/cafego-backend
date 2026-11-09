require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  const dir = path.join(__dirname, '../backups');
  fs.mkdirSync(dir, { recursive: true });
  for (const name of ['products', 'categories', 'orders', 'payments', 'tables']) {
    const docs = await mongoose.connection.db.collection(name).find().toArray();
    fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(docs, null, 2));
    console.log(`${name}: ${docs.length} bản ghi`);
  }
  await mongoose.disconnect();
})();