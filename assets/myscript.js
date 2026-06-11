let allData = [];
let primaryContainerData = [];

const fetchDataBtn = document.getElementById("fetchDataBtn");
const searchResultContainer = document.getElementById("searchResultContainer");
const resultsContainer = document.getElementById("resultsContainer");
const checkboxesContainer = document.getElementById("courseCheckboxesContainer");
const instantSearchBar = document.getElementById("instantSearchBar");
const professionSelect = document.getElementById("professionSelect");
const professionName = professionSelect.options[professionSelect.selectedIndex].text;

fetchDataBtn.addEventListener("click", async() => {
    const year = document.getElementById("yearSelect").value;
    const round = document.getElementById("roundSelect").value;
    // This now pulls the clean file name (e.g., "engineering") from the HTML value
    const profession = document.getElementById("professionSelect").value; 
    const region = document.getElementById("regionSelect").value;

    // NEW PATH: Incorporates the profession directly into the URL
    // Note: We use relative paths ('assets/...') so it works on GitHub Pages!
    const fileName = `assets/kcet_data/${year}/${round}/${profession}.json`;

    searchResultContainer.style.display = 'flex';
    resultsContainer.innerHTML = '<div class="loader"></div>';
    checkboxesContainer.innerHTML = '';

    try { 
        const response = await fetch(fileName);
    
        if(!response.ok) {
            throw new Error(`Server says: ${response.status}`);
        }

        allData = await response.json();
        
        primaryContainerData = allData.filter(item => {
            return region === 'regionBlank' ? true : item.Region === region;
        });
        
        generateCourseCheckboxes(primaryContainerData);
        renderResults(primaryContainerData);

    } catch (error) {
        console.error("Error loading file:", error);
        
        // Stop the loader
        resultsContainer.innerHTML = ''; 
        
        // Inject the custom KEA missing data message
        resultsContainer.innerHTML = `
            <div class="result-card" style="text-align: center; padding: 40px 20px;">
                <h3 style="color: #d32f2f; margin-bottom: 10px;">Data Unavailable</h3>
                <p style="color: #555; font-size: 1.1rem; line-height: 1.5;">
                    The <strong>${professionName}</strong> cutoff data for <strong>${year} Round ${round}</strong> is missing or currently unavailable on the official KEA website.
                </p>
            </div>
        `;
    }

function generateCourseCheckboxes(data) {
    const uniqueCourses = [...new Set(data.map(item => item.Course))].sort();

    checkboxesContainer.innerHTML = '';

    uniqueCourses.forEach(course => {
        const wrapper = document.createElement('div');
        wrapper.className = 'checkbox-wrapper';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `course-${course}`;
        checkbox.value = course;
        checkbox.className = 'course-checkbox';

        checkbox.addEventListener('change', applySecondaryFilters);

        const label = document.createElement('label');
        label.htmlFor = `course-${course}`;
        label.textContent = course;

        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        checkboxesContainer.appendChild(wrapper);
    });
}

instantSearchBar.addEventListener('input', applySecondaryFilters);

function applySecondaryFilters() {

    const searchTerm = instantSearchBar.value.toLowerCase();

    const checkedBoxes = Array.from(document.querySelectorAll('.course-checkbox:checked')).map(cb => cb.value);

    const finalData = primaryContainerData.filter(item => {

        const textMatch = item.College.toLowerCase().includes(searchTerm) || 
                          item.Course.toLowerCase().includes(searchTerm);

        const checkboxMatch = checkedBoxes.length === 0 ? true : checkedBoxes.includes(item.Course);

        return textMatch && checkboxMatch;
    });

    renderResults(finalData);
}


function renderResults(data) {
    resultsContainer.innerHTML = '';

    if (data.length === 0) {
        resultsContainer.innerHTML = '<p class="no-results">No colleges match your current filters.</p>';
        return;
    }

    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'result-card'; 

        let ranksHtml = '';
        const excludeKeys = ['College', 'Course', 'Region', 'Profession', 'Source_File'];
        
        for (const [key, value] of Object.entries(item)) {
            if (!excludeKeys.includes(key) && value !== null && value !== "") {
                
                ranksHtml += `<span class="rank-badge"><strong>${key}:</strong> ${value}</span> `;
            }
        }

        card.innerHTML = `
            <h3>${item.College}</h3>
            <p class="course-title">${item.Course} <span class="region-tag">(${item.Region})</span></p>
            <div class="ranks-container">
                ${ranksHtml}
            </div>
        `;

        resultsContainer.appendChild(card);
    });
}