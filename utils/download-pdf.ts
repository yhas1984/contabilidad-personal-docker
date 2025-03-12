/**
 * Utility function to trigger a file download in the browser.
 */
export function downloadPDF(dataUri: string, filename: string): void {
  // Create a temporary link element
  const link = document.createElement("a")

  // Set the download attribute and the href
  link.download = filename
  link.href = dataUri

  // Append to the document
  document.body.appendChild(link)

  // Programmatically click the link to trigger the download
  link.click()

  // Remove the link after the download starts
  document.body.removeChild(link)
}

