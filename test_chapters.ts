import { JsonDriver } from './src/drivers/JsonDriver.ts';

async function run() {
  const driver = new JsonDriver();
  await driver.init();
  const chapters = await driver.getChapters(undefined, undefined);
  console.log('Chapters:', chapters);
}
run();
