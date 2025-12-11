import React, { useEffect, useState } from "react";
import axios from "axios";
import "./AdminSettings.css";

export default function AdminSettings() {
  const token = localStorage.getItem("access");

  const API = axios.create({
    baseURL: "http://127.0.0.1:8000/api/auth/",
    headers: { Authorization: `Bearer ${token}` },
  });

  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);

  const [newDept, setNewDept] = useState("");
  const [selectedDeptForEdit, setSelectedDeptForEdit] = useState(null);
  const [editDeptName, setEditDeptName] = useState("");

  const [selectedDeptForRoles, setSelectedDeptForRoles] = useState(null);
  const [newRole, setNewRole] = useState("");
  const [editRoleId, setEditRoleId] = useState(null);
  const [editRoleName, setEditRoleName] = useState("");

  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 2500);
  };

  const loadData = async () => {
    const d = await API.get("departments/");
    const r = await API.get("roles/");
    setDepartments(d.data);
    setRoles(r.data);
  };

  // ADD DEPARTMENT
  const addDepartment = async () => {
    if (!newDept.trim()) return showMessage("Enter department name");

    try {
      await API.post("departments/", { department_name: newDept });
      setNewDept("");
      loadData();
      showMessage("Department added successfully");
    } catch (err) {
      const error = err.response?.data?.department_name?.[0] || "Something went wrong";
      showMessage(error);
    }
  };

  // UPDATE DEPARTMENT
  const saveDepartment = async () => {
    try {
      await API.put(`departments/${selectedDeptForEdit.id}/`, {
        department_name: editDeptName,
      });
      setSelectedDeptForEdit(null);
      setEditDeptName("");
      loadData();
      showMessage("Department updated");
    } catch (err) {
      const error = err.response?.data?.department_name?.[0] || "Something went wrong";
      showMessage(error);
    }
  };

  // DELETE DEPARTMENT
  const deleteDepartment = async () => {
    try {
      await API.delete(`departments/${selectedDeptForEdit.id}/`);
      setSelectedDeptForEdit(null);
      setEditDeptName("");
      loadData();
      showMessage("Department deleted");
    } catch {
      showMessage("Unable to delete department");
    }
  };

  // ADD ROLE
  const addRole = async () => {
    if (!newRole.trim()) return showMessage("Enter role name");

    try {
      await API.post("roles/", {
        role_name: newRole,
        department: selectedDeptForRoles.id,
      });

      setNewRole("");
      loadData();
      showMessage("Role added");
    } catch (err) {
      const error = err.response?.data?.role_name?.[0] || "Something went wrong";
      showMessage(error);
    }
  };

  // UPDATE ROLE
  const saveRole = async () => {
    try {
      await API.put(`roles/${editRoleId}/`, { role_name: editRoleName });
      setEditRoleId(null);
      setEditRoleName("");
      loadData();
      showMessage("Role updated");
    } catch (err) {
      const error = err.response?.data?.role_name?.[0] || "Something went wrong";
      showMessage(error);
    }
  };

  // DELETE ROLE
  const deleteRole = async (id) => {
    try {
      await API.delete(`roles/${id}/`);
      loadData();
      showMessage("Role deleted");
    } catch {
      showMessage("Unable to delete role");
    }
  };

  const rolesUnderDept = roles.filter(
    (r) => r.department === selectedDeptForRoles?.id
  );

  return (
    <div className="settings-wrapper">

      {/* DEPARTMENTS SECTION */}
      <div className="card">
        <h2 className="card-title">Departments</h2>

        <div className="input-row">
          <input
            type="text"
            placeholder="Add new department"
            value={newDept}
            onChange={(e) => setNewDept(e.target.value)}
          />
          <button className="btn-primary" onClick={addDepartment}>
            Add
          </button>
        </div>

        <select
          className="dropdown"
          onChange={(e) => {
            const dept = departments.find((d) => d.id == e.target.value);
            setSelectedDeptForEdit(dept);
            setEditDeptName(dept?.department_name || "");
          }}
        >
          <option value="">Select Department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.department_name}
            </option>
          ))}
        </select>

        {selectedDeptForEdit && (
          <div className="edit-box">
            <input
              value={editDeptName}
              onChange={(e) => setEditDeptName(e.target.value)}
            />
            <div className="button-row">
              <button className="btn-save" onClick={saveDepartment}>
                Save
              </button>
              <button
                className="btn-cancel"
                onClick={() => {
                  setSelectedDeptForEdit(null);
                  setEditDeptName("");
                }}
              >
                Cancel
              </button>
              <button className="btn-delete" onClick={deleteDepartment}>
                Delete
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ROLES SECTION */}
      <div className="card">
        <h2 className="card-title">Roles</h2>

        <select
          className="dropdown"
          onChange={(e) => {
            const dept = departments.find((d) => d.id == e.target.value);
            setSelectedDeptForRoles(dept || null);
          }}
        >
          <option value="">Select Department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.department_name}
            </option>
          ))}
        </select>

        {!selectedDeptForRoles && (
          <p className="info">Select a department to see roles</p>
        )}

        {selectedDeptForRoles && (
          <>
            <div className="input-row">
              <input
                type="text"
                placeholder="Add new role"
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              />
              <button className="btn-primary" onClick={addRole}>
                Add
              </button>
            </div>

            <ul className="role-list">
              {rolesUnderDept.length > 0 ? (
                rolesUnderDept.map((r) =>
                  editRoleId === r.id ? (
                    <li key={r.id} className="role-item">
                      <input
                        value={editRoleName}
                        onChange={(e) => setEditRoleName(e.target.value)}
                      />
                      <button className="btn-save" onClick={saveRole}>
                        Save
                      </button>
                      <button
                        className="btn-cancel"
                        onClick={() => setEditRoleId(null)}
                      >
                        Cancel
                      </button>
                    </li>
                  ) : (
                    <li key={r.id} className="role-item">
                      <span>{r.role_name}</span>
                      <div className="button-row">
                        <button
                          className="btn-edit"
                          onClick={() => {
                            setEditRoleId(r.id);
                            setEditRoleName(r.role_name);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-delete"
                          onClick={() => deleteRole(r.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  )
                )
              ) : (
                <p className="info">No roles in this department</p>
              )}
            </ul>
          </>
        )}
      </div>

      {/* TOAST MESSAGE AT BOTTOM */}
      {message && <p className="toast bottom">{message}</p>}
    </div>
  );
}
