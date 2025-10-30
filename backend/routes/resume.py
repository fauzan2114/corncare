"""
Resume Download Management Interface
Simple web interface for downloading expert resumes
"""

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.templating import Jinja2Templates
from database import get_database
from bson import ObjectId
import os

router = APIRouter(prefix="/resume", tags=["resume"])

# HTML template as string (simple approach)
RESUME_INTERFACE_HTML = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CornCare - Resume Download Interface</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            max-width: 1200px; 
            margin: 0 auto; 
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        h1 { 
            color: #2c5530; 
            text-align: center;
            margin-bottom: 30px;
        }
        .expert-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            margin: 15px 0;
            padding: 20px;
            background: #f9f9f9;
        }
        .expert-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }
        .expert-name {
            font-size: 1.2em;
            font-weight: bold;
            color: #333;
        }
        .expert-status {
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: bold;
            text-transform: uppercase;
        }
        .status-approved { background: #d4edda; color: #155724; }
        .status-pending { background: #fff3cd; color: #856404; }
        .status-rejected { background: #f8d7da; color: #721c24; }
        .expert-details {
            margin: 10px 0;
            color: #666;
        }
        .download-btn {
            background: #28a745;
            color: white;
            padding: 8px 16px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            font-size: 0.9em;
        }
        .download-btn:hover {
            background: #218838;
        }
        .download-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
        }
        .search-box {
            width: 100%;
            padding: 10px;
            margin-bottom: 20px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }
        .filter-buttons {
            text-align: center;
            margin: 20px 0;
        }
        .filter-btn {
            padding: 8px 16px;
            margin: 0 5px;
            border: 1px solid #ddd;
            background: white;
            border-radius: 5px;
            cursor: pointer;
        }
        .filter-btn.active {
            background: #007bff;
            color: white;
        }
        .no-resume {
            color: #dc3545;
            font-style: italic;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌽 CornCare Expert Resume Downloads</h1>
        
        <input type="text" id="searchBox" class="search-box" placeholder="Search by name, email, or specialization...">
        
        <div class="filter-buttons">
            <button class="filter-btn active" onclick="filterExperts('all')">All</button>
            <button class="filter-btn" onclick="filterExperts('approved')">Approved</button>
            <button class="filter-btn" onclick="filterExperts('pending')">Pending</button>
            <button class="filter-btn" onclick="filterExperts('rejected')">Rejected</button>
        </div>

        <div id="expertsList"></div>
    </div>

    <script>
        let allExperts = [];
        let currentFilter = 'all';

        async function loadExperts() {
            try {
                const response = await fetch('/resume/list-experts');
                if (response.ok) {
                    allExperts = await response.json();
                    displayExperts(allExperts);
                } else {
                    document.getElementById('expertsList').innerHTML = '<p style="color: red;">Failed to load experts</p>';
                }
            } catch (error) {
                document.getElementById('expertsList').innerHTML = '<p style="color: red;">Error loading experts: ' + error.message + '</p>';
            }
        }

        function displayExperts(experts) {
            const container = document.getElementById('expertsList');
            
            if (experts.length === 0) {
                container.innerHTML = '<p style="text-align: center; color: #666;">No experts found</p>';
                return;
            }

            container.innerHTML = experts.map(expert => `
                <div class="expert-card" data-status="${expert.verification_status}">
                    <div class="expert-header">
                        <div class="expert-name">${expert.name}</div>
                        <div class="expert-status status-${expert.verification_status}">${expert.verification_status}</div>
                    </div>
                    <div class="expert-details">
                        <div><strong>Email:</strong> ${expert.email}</div>
                        <div><strong>Specialization:</strong> ${expert.specialization}</div>
                        <div><strong>Experience:</strong> ${expert.experience} years</div>
                        <div><strong>Applied:</strong> ${new Date(expert.created_at).toLocaleDateString()}</div>
                        ${expert.resume_path ? 
                            `<div><strong>Resume:</strong> Available</div>
                             <a href="/resume/download/${expert.id}" class="download-btn" target="_blank">📄 Download Resume</a>` :
                            `<div class="no-resume"><strong>Resume:</strong> Not available</div>`
                        }
                    </div>
                </div>
            `).join('');
        }

        function filterExperts(status) {
            currentFilter = status;
            // Update active button
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            event.target.classList.add('active');
            
            const filtered = status === 'all' ? allExperts : allExperts.filter(expert => expert.verification_status === status);
            displayExperts(filtered);
        }

        function searchExperts() {
            const searchTerm = document.getElementById('searchBox').value.toLowerCase();
            const filtered = allExperts.filter(expert => {
                const matchesSearch = expert.name.toLowerCase().includes(searchTerm) ||
                                    expert.email.toLowerCase().includes(searchTerm) ||
                                    expert.specialization.toLowerCase().includes(searchTerm);
                const matchesFilter = currentFilter === 'all' || expert.verification_status === currentFilter;
                return matchesSearch && matchesFilter;
            });
            displayExperts(filtered);
        }

        document.getElementById('searchBox').addEventListener('input', searchExperts);

        // Load experts on page load
        loadExperts();
    </script>
</body>
</html>
"""

@router.get("/", response_class=HTMLResponse)
async def resume_interface():
    """Serve the resume download interface"""
    return HTMLResponse(content=RESUME_INTERFACE_HTML)

@router.get("/list-experts")
async def list_experts_for_resume():
    """Get list of all experts with resume information"""
    db = get_database()
    
    experts = await db.experts.find(
        {},
        {
            "name": 1,
            "email": 1, 
            "specialization": 1,
            "experience": 1,
            "verification_status": 1,
            "resume_path": 1,
            "created_at": 1
        }
    ).to_list(None)
    
    # Convert ObjectId to string and format data
    formatted_experts = []
    for expert in experts:
        expert["id"] = str(expert["_id"])
        expert.pop("_id", None)
        
        # Ensure all required fields exist
        expert["verification_status"] = expert.get("verification_status", "unknown")
        expert["created_at"] = expert.get("created_at", "N/A")
        
        formatted_experts.append(expert)
    
    return formatted_experts

@router.get("/download/{expert_id}")
async def download_expert_resume_by_id(expert_id: str):
    """Download expert's resume by expert ID"""
    db = get_database()
    
    try:
        expert = await db.experts.find_one({"_id": ObjectId(expert_id)})
        if not expert:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Expert not found"
            )
        
        resume_path = expert.get("resume_path")
        if not resume_path or not os.path.exists(resume_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Resume file not found"
            )
        
        # Create a meaningful filename
        original_filename = os.path.basename(resume_path)
        expert_name = expert['name'].replace(' ', '_').replace('.', '_')
        download_filename = f"resume_{expert_name}_{original_filename}"
        
        return FileResponse(
            path=resume_path,
            filename=download_filename,
            media_type="application/octet-stream"
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error downloading resume: {str(e)}"
        )