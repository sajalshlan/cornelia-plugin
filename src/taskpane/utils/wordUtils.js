import { logger } from '../../api';

const searchAndReplaceText = async (context, searchText, replacementText = null) => {
  // Split search text into chunks of 255 characters
  const chunks = searchText.match(/.{1,255}/g) || [];
  
  // If text is shorter than 255 characters, do a simple search
  if (chunks.length === 1) {
    const searchResults = context.document.body.search(searchText);
    context.load(searchResults);
    await context.sync();
    
    if (searchResults.items.length > 0) {
      if (replacementText) {
        searchResults.items[0].insertText(replacementText, Word.InsertLocation.replace);
      }
      return searchResults.items[0];
    }
    return null;
  }

  // For longer texts, delete all chunks and replace at first chunk position
  let firstChunkRange = null;

  // Find and store the position of the first chunk
  const firstChunkResults = context.document.body.search(chunks[0]);
  context.load(firstChunkResults);
  await context.sync();

  if (firstChunkResults.items.length > 0) {
    firstChunkRange = firstChunkResults.items[0].getRange();
  } else {
    return null; // Can't find even the first chunk
  }

  // Delete all chunks from last to first (to maintain positions)
  for (let i = chunks.length - 1; i >= 0; i--) {
    const chunk = chunks[i];
    const searchResults = context.document.body.search(chunk);
    context.load(searchResults);
    await context.sync();

    for (let j = 0; j < searchResults.items.length; j++) {
      searchResults.items[j].insertText('', Word.InsertLocation.replace); // Delete the chunk
    }
    await context.sync();
  }

  // Insert new text at the position of the first chunk
  if (replacementText) {
    firstChunkRange.insertText(replacementText, Word.InsertLocation.replace);
    await context.sync();
  }

  return firstChunkRange;
};

export { searchAndReplaceText }; 
