import { IngestionError } from "@/services/ingestion/ingestionError"
import { MAX_FILE_BYTES } from "@/services/ingestion/ingestionService"

export async function readSalesUpload(request: Request): Promise<File> {
  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    throw new IngestionError(
      "Debes adjuntar el archivo en el campo `file`",
      400
    )
  }

  if (!file.name.toLowerCase().endsWith(".xlsx")) {
    throw new IngestionError("Solo se aceptan archivos .xlsx", 415)
  }

  if (file.size > MAX_FILE_BYTES) {
    throw new IngestionError("El archivo supera el límite de 10 MB", 413)
  }

  return file
}
