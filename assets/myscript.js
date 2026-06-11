let allData = [];
let primaryContainerData = [];

// DOM Elements
const fetchDataBtn = document.getElementById("fetchDataBtn");
const searchResultContainer = document.getElementById("searchResultContainer");
const resultsContainer = document.getElementById("resultsContainer");
const checkboxesContainer = document.getElementById("courseCheckboxesContainer");
const categoryCheckboxesContainer = document.getElementById("categoryCheckboxesContainer");
const instantSearchBar = document.getElementById("instantSearchBar");
const minRankInput = document.getElementById("minRankInput");
const maxRankInput = document.getElementById("maxRankInput");
const clearFiltersBtn = document.getElementById("clearFiltersBtn");

// Event Listeners for new inputs
instantSearchBar.addEventListener('input', applySecondaryFilters);
minRankInput.addEventListener('input', applySecondaryFilters);
maxRankInput.addEventListener('input', applySecondaryFilters);
clearFiltersBtn.addEventListener('click', () => {
    instantSearchBar.value = '';

    minRankInput.value = '';
    maxRankInput.value = '';

    const courseCheckboxes = document.querySelectorAll('.course-checkbox');
    courseCheckboxes.forEach(checkbox => checkbox.checked = false);

    const categoryCheckboxes = document.querySelectorAll('.category-checkbox');
    categoryCheckboxes.forEach(checkbox => checkbox.checked = false);

    applySecondaryFilters();
});

// MAIN FETCH FUNCTION
fetchDataBtn.addEventListener("click", async() => {
    const year = document.getElementById("yearSelect").value;
    const round = document.getElementById("roundSelect").value;
    const region = document.getElementById("regionSelect").value;
    const professionSelect = document.getElementById("professionSelect");
    
    const profession = professionSelect.value; 
    const professionName = professionSelect.options[professionSelect.selectedIndex].text; 

    const fileName = `assets/kcet_data/${year}/${round}/${profession}.json`;

    searchResultContainer.style.display = 'flex';
    resultsContainer.innerHTML = '<div class="loader"></div>';
    
    // Clear out old filters
    checkboxesContainer.innerHTML = '';
    categoryCheckboxesContainer.innerHTML = '';
    minRankInput.value = '';
    maxRankInput.value = '';

    try { 
        const response = await fetch(fileName);
    
        if(!response.ok) {
            throw new Error(`Server says: ${response.status}`);
        }

        allData = await response.json();
        
        primaryContainerData = allData.filter(item => {
            return region === 'regionBlank' ? true : item.Region === region;
        });
        
        // Generate dynamic filters
        generateCourseCheckboxes(primaryContainerData);
        generateCategoryCheckboxes(primaryContainerData);
        
        renderResults(primaryContainerData);

    } catch (error) {
        console.error("Error loading file:", error);
        resultsContainer.innerHTML = `
            <div class="result-card" style="text-align: center; padding: 40px 20px;">
                <h3 style="color: #d32f2f; margin-bottom: 10px;">Data Unavailable</h3>
                <p style="color: #555; font-size: 1.1rem; line-height: 1.5;">
                    The <strong>${professionName}</strong> cutoff data for <strong>${year} Round ${round}</strong> is missing or currently unavailable on the official KEA website.
                </p>
            </div>
        `;
    }
});

// GENERATE COURSES
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

// GENERATE CATEGORIES
function generateCategoryCheckboxes(data) {
    const excludeKeys = ['College', 'Course', 'Region', 'Profession', 'Source_File'];
    const categoriesSet = new Set();

    // Loop through all data to find every unique category key that actually has a value
    data.forEach(item => {
        for (const [key, value] of Object.entries(item)) {
            if (!excludeKeys.includes(key) && value !== null && value !== "") {
                categoriesSet.add(key);
            }
        }
    });

    const uniqueCategories = [...categoriesSet].sort();
    categoryCheckboxesContainer.innerHTML = '';

    uniqueCategories.forEach(category => {
        const wrapper = document.createElement('div');
        wrapper.className = 'checkbox-wrapper';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `cat-${category}`;
        checkbox.value = category;
        checkbox.className = 'category-checkbox';
        checkbox.addEventListener('change', applySecondaryFilters);

        const label = document.createElement('label');
        label.htmlFor = `cat-${category}`;
        label.textContent = category;

        wrapper.appendChild(checkbox);
        wrapper.appendChild(label);
        categoryCheckboxesContainer.appendChild(wrapper);
    });
}

// FILTERING LOGIC
function applySecondaryFilters() {
    const searchTerm = instantSearchBar.value.toLowerCase();
    const checkedCourses = Array.from(document.querySelectorAll('.course-checkbox:checked')).map(cb => cb.value);
    const checkedCategories = Array.from(document.querySelectorAll('.category-checkbox:checked')).map(cb => cb.value);
    
    // Get rank inputs, default to 0 and Infinity if empty
    const minRank = parseInt(minRankInput.value) || 0;
    const maxRank = parseInt(maxRankInput.value) || Infinity;

    const finalData = primaryContainerData.filter(item => {
        const textMatch = item.College.toLowerCase().includes(searchTerm) || item.Course.toLowerCase().includes(searchTerm);
        const courseMatch = checkedCourses.length === 0 ? true : checkedCourses.includes(item.Course);

        let categoryRankMatch = false;
        const excludeKeys = ['College', 'Course', 'Region', 'Profession', 'Source_File'];

        for (const [key, value] of Object.entries(item)) {
            if (!excludeKeys.includes(key) && value !== null && value !== "") {
                const rankVal = parseInt(value);
                
                // If user checked specific categories, only look at those
                const isCategoryChecked = checkedCategories.length === 0 || checkedCategories.includes(key);

                // If it matches the category check AND falls between the min/max ranks
                if (isCategoryChecked && rankVal >= minRank && rankVal <= maxRank) {
                    categoryRankMatch = true;
                    break; // Stop looking, this college is a valid match!
                }
            }
        }

        return textMatch && courseMatch && categoryRankMatch;
    });

    // Pass the checked categories to renderResults so we can hide unwanted badges
    renderResults(finalData, checkedCategories);
}

// RENDER CARDS
function renderResults(data, checkedCategories = []) {
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
                
                // UX UPGRADE: If categories are selected, ONLY show the selected category badges!
                if (checkedCategories.length === 0 || checkedCategories.includes(key)) {
                    ranksHtml += `<span class="rank-badge"><strong>${key}:</strong> ${value}</span> `;
                }
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