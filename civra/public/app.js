const sheet = document.querySelector("#sheet")
const fileInput = document.querySelector("#ownerFile")
const fileOk = document.querySelector("#fileOk")
const continueButton = document.querySelector("#continueButton")
const guide = document.querySelector("#guide")

function openSheet() {
  sheet.classList.add("show")
  sheet.setAttribute("aria-hidden", "false")
}

function closeSheet() {
  sheet.classList.remove("show")
  sheet.setAttribute("aria-hidden", "true")
}

document.querySelector("#openFlow").addEventListener("click", openSheet)
document.querySelector("#closeFlow").addEventListener("click", closeSheet)
document.querySelector("#closeButton").addEventListener("click", closeSheet)
document.querySelector("#helpButton").addEventListener("click", () => {
  guide.classList.add("show")
  guide.setAttribute("aria-hidden", "false")
})
document.querySelector("#closeGuide").addEventListener("click", () => {
  guide.classList.remove("show")
  guide.setAttribute("aria-hidden", "true")
})
document.querySelector("#startGuide").addEventListener("click", () => {
  guide.classList.remove("show")
  guide.setAttribute("aria-hidden", "true")
  openSheet()
})

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0]
  if (!file) return
  fileOk.textContent = `${file.name} is ready to check.`
  continueButton.disabled = false
})

continueButton.addEventListener("click", () => {
  continueButton.textContent = "File checked. Form is ready for your review."
  continueButton.disabled = true
})
