const path = require('node:path');

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

function assertPrivateArtifactPath(candidate, { repoRoot = process.cwd(), label = 'Private artifact' } = {}) {
  const absolute = path.resolve(candidate);
  const repository = path.resolve(repoRoot);
  const privateRoot = path.join(repository, '.clawbotomy');

  if (isWithin(repository, absolute) && !isWithin(privateRoot, absolute)) {
    throw new Error(
      `${label} must be outside the repository or under ${privateRoot}; refusing a potentially served or tracked path.`,
    );
  }
  return absolute;
}

module.exports = { assertPrivateArtifactPath, isWithin };
