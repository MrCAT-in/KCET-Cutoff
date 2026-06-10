let allData = [];
let primaryContainerData = [];

const fetchDataBtn = document.getElementById("fetchDataBtn");
const searchResultContainer = document.getElementById("searchResultContainer");
const resultsContainer = document.getElementById("resultsContainer");
const checkboxesContainer = document.getElementById("courseCheckboxesContainer");
const instantSearchBar = document.getElementById("instantSearchBar");

fetchDataBtn.addEventListener("click", async() => {
    const year = document.getElementById("yearSelect").value;
    const round = document.getElementById("roundSelect").value;
    const profession = document.getElementById("professionSelect").value;
    const region = document.getElementById("regionSelect").value;

    const fileName = `assets/kcet_data/${year}/${round}.json`;

    console.log(fileName);

    try { 
        const response = await fetch(fileName);
    
    if(!response.ok) {
        throw new Error('Server says: ${response.status}')
    }


    allData = await response.json();
    console.log("Success! Here is the data:", allData);

    primaryContainerData = allData.filter(item => {
        const matchProfession = item.Profession === profession;
        const matchRegion = region === 'all' ? true : item.Region === region;
        return matchProfession && matchRegion;
    });
    searchResultContainer.style.display = 'flex';
    generateCourseCheckboxes(primaryContainerData);
    renderResults(primaryContainerData);
    } catch (error) {
        console.error("Error loading file:", error);
        resultsContainer.innerHTML = `<p style="color:red;">Sorry, the data for ${year} Round ${round} is not available yet.</p>`;
    }
});

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
            if (!excludeKeys.includes(key)) {
                // Generates a tiny badge for each cast/rank
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