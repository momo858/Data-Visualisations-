

let parsedCsvData = null; // global variable

const uploadBtn = document.getElementById('uploadBtn');
const csvInput  = document.getElementById('csvInput');

uploadBtn.addEventListener('click', () => {
    console.log('Upload CSV button clicked');
    csvInput.click(); // open file dialog
});

csvInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) {
        console.log('No file selected');
        return;
    }

    console.log('File selected:', file.name);

    Papa.parse(file, {
        header: true,          // first row = column names
        dynamicTyping: true,   // convert numbers automatically
        complete: function (results) {
            console.log('Parsing complete');
            console.log('Raw results:', results);

            parsedCsvData = results.data;  // save globally
            console.log('Parsed rows:', parsedCsvData);
            console.log('First row:', parsedCsvData[0]);
        },
        error: function (err) {
            console.error('Error while parsing CSV:', err);
        }
    });
});
