from fpdf import FPDF
import os

os.makedirs("data/handbook", exist_ok=True)
pdf = FPDF()
pdf.add_page()
pdf.set_font("Arial", size=12)
pdf.cell(200, 10, txt="Welcome to the College Handbook.", ln=1, align='L')
pdf.cell(200, 10, txt="Database Management Systems (DBMS) has 4 credits.", ln=2, align='L')
pdf.cell(200, 10, txt="Internal exams are scheduled for December.", ln=3, align='L')
pdf.output("data/handbook/dummy_handbook.pdf")
print("Dummy PDF created successfully.")
