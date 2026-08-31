const sheet = document.querySelector("#sheet")
const fileInput = document.querySelector("#ownerFile")
const fileOk = document.querySelector("#fileOk")
const continueButton = document.querySelector("#continueButton")
const guide = document.querySelector("#guide")
const tourTitle = document.querySelector("#tourTitle")
const tourText = document.querySelector("#tourText")
const tourDemo = document.querySelector("#tourDemo")
const tourCount = document.querySelector("#tourCount")
const tourIcon = document.querySelector("#tourIcon")
const tourBar = document.querySelector("#tourBar")
const tourBack = document.querySelector("#tourBack")
const tourNext = document.querySelector("#tourNext")
const liveCheck = document.querySelector("#liveCheck")
const liveStatus = document.querySelector("#liveStatus")

const allowedFileTypes = new Set(["application/pdf", "image/jpeg", "image/png"])
const maxFileBytes = 10 * 1024 * 1024

const tourSteps = [
  {
    title: "See what needs care.",
    text: "Your home page shows every permit and the next date that needs your care.",
    demo: "<strong>Food Service Permit</strong><small>21 days left. Civra marks this as the next task.</small>"
  },
  {
    title: "Open the permit task.",
    text: "Civra finds the right city page and makes one clear list of what the city asks for.",
    demo: "<div class='toursource'><strong>City page found</strong><span class='tourtag'>CHECKED</span></div><div class='toursource'><strong>12 facts needed</strong><span class='tourtag'>READY</span></div>"
  },
  {
    title: "Check every saved fact.",
    text: "Each answer shows where it came from. You can fix any answer before Civra uses it.",
    demo: "<div class='toursource'><div><strong>Maya's Kitchen</strong><small>Business name</small></div><span class='tourtag'>BUSINESS FILE</span></div><div class='toursource'><div><strong>128 Orchard Street</strong><small>Business address</small></div><span class='tourtag'>LEASE</span></div>"
  },
  {
    title: "Add only what is missing.",
    text: "Civra asks for one missing file at a time. You do not need to start the form again.",
    demo: "<strong>Owner photo needed</strong><small>JPG, PNG, or PDF. In this demo, the file stays in your browser.</small>"
  },
  {
    title: "Check the safety rules.",
    text: "Civra shows what will happen before any file leaves your control.",
    demo: "<div class='tourlock'><span>1</span><div><strong>No hidden send</strong><small>The demo does not send your file to any city site.</small></div></div><div class='tourlock'><span>2</span><div><strong>Separate work space</strong><small>Real file checks will use a private Solari work space.</small></div></div><div class='tourlock'><span>3</span><div><strong>No key in the page</strong><small>The Solari key stays on the server, not in the browser.</small></div></div>"
  },
  {
    title: "You make the final choice.",
    text: "Review the full form, payment, and files. Civra waits until you choose to go on.",
    demo: "<strong>Ready for owner review</strong><small>No payment made. No form sent. You stay in charge.</small>"
  }
]

let tourStep = 0

function showTourStep() {
  const step = tourSteps[tourStep]
  tourTitle.textContent = step.title
  tourText.textContent = step.text
  tourDemo.innerHTML = step.demo
  tourCount.textContent = `Step ${tourStep + 1} of ${tourSteps.length}`
  tourIcon.textContent = String(tourStep + 1)
  tourBar.className = `tourbar${tourStep + 1}`
  tourBack.disabled = tourStep === 0
  tourNext.textContent = tourStep === tourSteps.length - 1 ? "Open my permit task" : "Next step"
}

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
  tourStep = 0
  showTourStep()
  guide.classList.add("show")
  guide.setAttribute("aria-hidden", "false")
})
document.querySelector("#closeGuide").addEventListener("click", () => {
  guide.classList.remove("show")
  guide.setAttribute("aria-hidden", "true")
})
tourBack.addEventListener("click", () => {
  if (tourStep === 0) return
  tourStep -= 1
  showTourStep()
})
tourNext.addEventListener("click", () => {
  if (tourStep < tourSteps.length - 1) {
    tourStep += 1
    showTourStep()
    return
  }
  guide.classList.remove("show")
  guide.setAttribute("aria-hidden", "true")
  openSheet()
})

fileInput.addEventListener("change", () => {
  const file = fileInput.files[0]
  if (!file) return

  if (!allowedFileTypes.has(file.type)) {
    fileOk.textContent = "This file type is not allowed. Use JPG, PNG, or PDF."
    continueButton.disabled = true
    fileInput.value = ""
    return
  }

  if (file.size > maxFileBytes) {
    fileOk.textContent = "This file is too large. Use a file under 10 MB."
    continueButton.disabled = true
    fileInput.value = ""
    return
  }

  fileOk.textContent = `${file.name} is ready to check.`
  continueButton.disabled = false
})

continueButton.addEventListener("click", () => {
  continueButton.textContent = "File checked. Form is ready for your review."
  continueButton.disabled = true
})

liveCheck.addEventListener("click", async () => {
  liveCheck.disabled = true
  liveStatus.textContent = "Solari is checking the official city page."

  try {
    const response = await fetch("/api/permit-check", { method: "POST" })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message || "The city check failed.")

    const found = Object.values(result.checks).filter(Boolean).length
    liveStatus.textContent = `Live check done. ${found} of 4 permit needs were found on the city page.`
  } catch (error) {
    liveStatus.textContent = error instanceof Error ? error.message : "The city check failed."
  } finally {
    liveCheck.disabled = false
  }
})
