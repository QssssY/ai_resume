<template>
  <div class="export-toolbar">
    <el-button @click="exportPDF" :loading="exporting">
      导出 PDF
    </el-button>
    <el-button @click="exportImage" :loading="exporting">
      导出图片
    </el-button>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

const props = defineProps({
  targetRef: { type: Object, default: null },
  fileName: { type: String, default: '简历' }
})

const exporting = ref(false)

async function captureCanvas() {
  if (!props.targetRef) return null
  return await html2canvas(props.targetRef, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff'
  })
}

async function exportPDF() {
  exporting.value = true
  try {
    const canvas = await captureCanvas()
    if (!canvas) return

    const imgData = canvas.toDataURL('image/jpeg', 0.95)
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width

    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
    pdf.save(`${props.fileName}.pdf`)
  } finally {
    exporting.value = false
  }
}

async function exportImage() {
  exporting.value = true
  try {
    const canvas = await captureCanvas()
    if (!canvas) return

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${props.fileName}.png`
      a.click()
      URL.revokeObjectURL(url)
    }, 'image/png')
  } finally {
    exporting.value = false
  }
}
</script>

<style scoped>
.export-toolbar {
  display: flex;
  gap: 8px;
}
</style>
