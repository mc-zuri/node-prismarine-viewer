module.exports = {
  mineflayer: require('./lib/mineflayer'),
  bedrockMineflayer: require('./lib/bedrock-mineflayer'),
  standalone: require('./lib/standalone'),
  headless: require('./lib/headless'),
  viewer: require('./viewer'),
  supportedVersions: require('./viewer').supportedVersions
}
