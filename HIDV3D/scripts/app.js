// ============================================
// APPLICATION CONTROLLER
// ============================================

document.addEventListener("DOMContentLoaded", function () {
  let parsedCsvData = null;
  let columnDetector = null;
  const viewer = new CSV3DViewer("view3d");
  window.viewer = viewer; // Add this line

  const uploadBtn = document.getElementById("uploadBtn");
  const csvInput = document.getElementById("csvInput");
  const visualizeBtn = document.getElementById("visualizeBtn");
  const resetBtn = document.getElementById("resetBtn");
  const columnSelector = document.getElementById("columnSelector");
  const dataInfo = document.getElementById("dataInfo");

  uploadBtn.addEventListener("click", () => csvInput.click());

  csvInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: function (results) {
        parsedCsvData = results.data.filter(
          (row) => Object.keys(row).length > 0
        );

        if (parsedCsvData.length === 0) {
          alert("CSV file is empty or invalid!");
          return;
        }

        columnDetector = new ColumnDetector(parsedCsvData, viewer.dataMapper);
        const columns = columnDetector.getAllColumns();

        // Update UI
        const numericCount = columns.filter((c) => c.isNumeric).length;
        const categoricalCount = columns.length - numericCount;

        document.getElementById("rowCount").textContent = parsedCsvData.length;
        document.getElementById("colCount").textContent = columns.length;
        document.getElementById("numericCount").textContent = numericCount;
        document.getElementById("categoricalCount").textContent =
          categoricalCount;
        dataInfo.style.display = "block";

        // Populate column selectors
        populateColumnSelectors(columns);

        // Auto-select best columns
        const bestCols = columnDetector.detectBestColumns();
        document.getElementById("xAxis").value = bestCols.x;
        document.getElementById("yAxis").value = bestCols.y;
        document.getElementById("zAxis").value = bestCols.z;

        columnSelector.classList.add("visible");
        visualizeBtn.disabled = false;
        resetBtn.disabled = false;

        console.log("CSV loaded:", parsedCsvData.length, "rows");
      },
      error: function (err) {
        console.error("CSV parsing error:", err);
        alert("Error parsing CSV file!");
      },
    });
  });

  function populateColumnSelectors(columns) {
    const xAxis = document.getElementById("xAxis");
    const yAxis = document.getElementById("yAxis");
    const zAxis = document.getElementById("zAxis");

    [xAxis, yAxis, zAxis].forEach((select) => {
      select.innerHTML = "";
      columns.forEach((col) => {
        const option = document.createElement("option");
        option.value = col.name;
        option.textContent = `${col.name} ${col.isNumeric ? "(#)" : "(cat)"}`;
        select.appendChild(option);
      });
    });
  }

  visualizeBtn.addEventListener("click", () => {
    if (!parsedCsvData) {
      alert("Please upload a CSV file first!");
      return;
    }

    viewer.initScene();

    const xCol = document.getElementById("xAxis").value;
    const yCol = document.getElementById("yAxis").value;
    const zCol = document.getElementById("zAxis").value;

    viewer.visualizeData(parsedCsvData, xCol, yCol, zCol);
  });

  resetBtn.addEventListener("click", () => {
    parsedCsvData = null;
    columnDetector = null;
    viewer.clearScene();
    columnSelector.classList.remove("visible");
    dataInfo.style.display = "none";
    document.getElementById("legend").style.display = "none";
    visualizeBtn.disabled = true;
    resetBtn.disabled = true;
    csvInput.value = "";
    console.log("Reset complete");
  });

  console.log("HIDV3D Universal CSV Visualizer initialized!");
});
