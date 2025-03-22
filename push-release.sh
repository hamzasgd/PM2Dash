#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting PM2Dash release process..."

# Check if we're already on the release branch
CURRENT_BRANCH=$(git branch --show-current)
RELEASE_BRANCH="release-v1.0.0"

if [ "$CURRENT_BRANCH" != "$RELEASE_BRANCH" ]; then
  echo "❌ Error: You must be on the $RELEASE_BRANCH branch."
  echo "Run 'git checkout $RELEASE_BRANCH' and try again."
  exit 1
fi

# Stage all files in the releases directory
echo "📦 Staging release files..."
git add releases/

# Commit the changes
echo "💾 Committing release files..."
git commit -m "Add PM2Dash v1.0.0 release files"

# Push to the remote repository
echo "☁️ Pushing to GitHub..."
git push origin $RELEASE_BRANCH

echo "✅ Files pushed successfully to $RELEASE_BRANCH branch!"
echo
echo "Next steps:"
echo "1. Go to GitHub and create a new release"
echo "2. Set the tag to 'v1.0.0' and target the '$RELEASE_BRANCH' branch"
echo "3. Set the title to 'PM2Dash v1.0.0'"
echo "4. Upload additional files if needed or copy contents from releases/"
echo "5. Paste the content from releases/RELEASE_NOTES.md into the description"
echo "6. Publish the release"
echo
echo "Remember: Once the release is published, users will be able to download and install PM2Dash!" 