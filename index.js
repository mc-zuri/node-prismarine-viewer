module.exports = {
  mineflayer: require('./lib/mineflayer'),
  bedrockMineflayer: require('./lib/bedrock-mineflayer'),
  prismarineBedrock: require('./lib/prismarine-bedrock'),
  standalone: require('./lib/standalone'),
  headless: require('./lib/headless'),
  viewer: require('./viewer'),
  supportedVersions: require('./viewer').supportedVersions
}
