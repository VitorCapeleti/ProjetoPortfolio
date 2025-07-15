document.addEventListener("DOMContentLoaded", () => {
    const menuBtn = document.getElementById("menuToggle");
    const dropdown = document.getElementById("dropdownMenu");

    menuBtn.addEventListener("click", () => {
        menuBtn.classList.toggle("open");
        dropdown.classList.toggle("show");
    });

    window.addEventListener("click", function(e) {
        if (!menuBtn.contains(e.target) && !dropdown.contains(e.target)) {
            menuBtn.classList.remove("open");
            dropdown.classList.remove("show");
        }
    });
});
