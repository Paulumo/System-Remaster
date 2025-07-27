/**
 * DragDropManager - Handles drag and drop functionality for waypoint reordering
 * Provides accessible drag and drop with keyboard support and visual feedback
 */

import { CONFIG } from '../config.js';
import { domCache, addEventListenerWithCleanup } from './utils/dom.js';
import { stateManager } from './StateManager.js';

export class DragDropManager {
  constructor(waypointManager) {
    this.waypointManager = waypointManager;
    this.draggedElement = null;
    this.draggedIndex = -1;
    this.dropTarget = null;
    this.routeContainer = null;
    this.isInitialized = false;
    this.eventCleanupFunctions = [];
    this.mutationObserver = null;
    
    // Touch support variables
    this.touchStartY = 0;
    this.touchCurrentY = 0;
    this.isTouchDragging = false;
    this.touchScrollOffset = 0;
  }

  /**
   * Initialize drag and drop functionality
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      this.routeContainer = domCache.get('.w-80.flex-shrink-0');
      if (!this.routeContainer) {
        throw new Error('Route container not found');
      }
      
      this.setupDragAndDrop();
      this.setupMutationObserver();
      this.isInitialized = true;
      
      console.log('DragDropManager initialized successfully');
    } catch (error) {
      console.error('Failed to initialize DragDropManager:', error);
      throw error;
    }
  }

  /**
   * Setup drag and drop functionality
   * @private
   */
  setupDragAndDrop() {
    this.makeWaypointsDraggable();
    
    // Setup global drag event listeners
    const cleanup1 = addEventListenerWithCleanup(document, 'dragover', (e) => {
      e.preventDefault(); // Allow drop
    });
    
    const cleanup2 = addEventListenerWithCleanup(document, 'drop', (e) => {
      e.preventDefault(); // Prevent default browser behavior
    });
    
    this.eventCleanupFunctions.push(cleanup1, cleanup2);
  }

  /**
   * Make waypoint items draggable
   * @private
   */
  makeWaypointsDraggable() {
    if (!this.routeContainer) return;
    
    const waypoints = this.routeContainer.querySelectorAll('.waypoint-item');
    
    waypoints.forEach((waypoint, index) => {
      // Skip if this is the "Continue with OFP" button container
      if (waypoint.querySelector('#continue-ofp-btn')) return;
      
      this.setupWaypointDragEvents(waypoint, index);
    });
    
    console.log(`Made ${waypoints.length} waypoints draggable`);
  }

  /**
   * Setup drag events for a waypoint element
   * @private
   * @param {HTMLElement} waypoint - Waypoint element
   * @param {number} index - Waypoint index
   */
  setupWaypointDragEvents(waypoint, index) {
    // Make draggable
    waypoint.draggable = true;
    waypoint.setAttribute('role', 'listitem');
    waypoint.setAttribute('aria-label', `Waypoint ${waypoint.dataset.waypointName || index + 1}. Draggable item ${index + 1} of ${this.getWaypointCount()}`);
    waypoint.setAttribute('tabindex', '0');
    
    // Remove existing listeners to prevent duplicates
    this.removeWaypointEventListeners(waypoint);
    
    // Mouse drag events
    const dragStartCleanup = addEventListenerWithCleanup(waypoint, 'dragstart', (e) => {
      this.handleDragStart(e, waypoint, index);
    });
    
    const dragOverCleanup = addEventListenerWithCleanup(waypoint, 'dragover', (e) => {
      this.handleDragOver(e, waypoint);
    });
    
    const dragLeaveCleanup = addEventListenerWithCleanup(waypoint, 'dragleave', (e) => {
      this.handleDragLeave(e, waypoint);
    });
    
    const dropCleanup = addEventListenerWithCleanup(waypoint, 'drop', (e) => {
      this.handleDrop(e, waypoint, index);
    });
    
    const dragEndCleanup = addEventListenerWithCleanup(waypoint, 'dragend', (e) => {
      this.handleDragEnd(e, waypoint);
    });
    
    // Keyboard support
    const keydownCleanup = addEventListenerWithCleanup(waypoint, 'keydown', (e) => {
      this.handleKeyboardNavigation(e, waypoint, index);
    });
    
    // Touch support
    const touchStartCleanup = addEventListenerWithCleanup(waypoint, 'touchstart', (e) => {
      this.handleTouchStart(e, waypoint, index);
    }, { passive: false });
    
    const touchMoveCleanup = addEventListenerWithCleanup(waypoint, 'touchmove', (e) => {
      this.handleTouchMove(e, waypoint);
    }, { passive: false });
    
    const touchEndCleanup = addEventListenerWithCleanup(waypoint, 'touchend', (e) => {
      this.handleTouchEnd(e, waypoint);
    }, { passive: false });
    
    // Store cleanup functions
    waypoint._dragCleanupFunctions = [
      dragStartCleanup, dragOverCleanup, dragLeaveCleanup, 
      dropCleanup, dragEndCleanup, keydownCleanup,
      touchStartCleanup, touchMoveCleanup, touchEndCleanup
    ];
  }

  /**
   * Remove event listeners from waypoint
   * @private
   * @param {HTMLElement} waypoint - Waypoint element
   */
  removeWaypointEventListeners(waypoint) {
    if (waypoint._dragCleanupFunctions) {
      waypoint._dragCleanupFunctions.forEach(cleanup => cleanup());
      waypoint._dragCleanupFunctions = [];
    }
  }

  /**
   * Handle drag start event
   * @private
   * @param {DragEvent} e - Drag event
   * @param {HTMLElement} waypoint - Waypoint element
   * @param {number} index - Waypoint index
   */
  handleDragStart(e, waypoint, index) {
    try {
      this.draggedElement = waypoint;
      this.draggedIndex = index;
      
      // Add dragging class for visual feedback
      waypoint.classList.add(CONFIG.CLASSES.WAYPOINT_DRAGGING);
      waypoint.style.cursor = 'grabbing';
      
      // Set drag data
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', waypoint.dataset.waypointName || index.toString());
      
      // Announce to screen readers
      this.announceToScreenReader(`Started dragging waypoint ${waypoint.dataset.waypointName || index + 1}`);
      
      console.log(`Drag started for waypoint: ${waypoint.dataset.waypointName}`);
      
    } catch (error) {
      console.error('Error in drag start:', error);
    }
  }

  /**
   * Handle drag over event
   * @private
   * @param {DragEvent} e - Drag event
   * @param {HTMLElement} waypoint - Waypoint element
   */
  handleDragOver(e, waypoint) {
    try {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      
      // Clear previous drop targets
      this.clearDropTargets();
      
      // Add visual feedback for drop target
      if (waypoint !== this.draggedElement) {
        waypoint.classList.add(CONFIG.CLASSES.WAYPOINT_DRAG_OVER);
        waypoint.classList.add(CONFIG.CLASSES.WAYPOINT_DROP_TARGET);
        this.dropTarget = waypoint;
      }
      
    } catch (error) {
      console.error('Error in drag over:', error);
    }
  }

  /**
   * Handle drag leave event
   * @private
   * @param {DragEvent} e - Drag event
   * @param {HTMLElement} waypoint - Waypoint element
   */
  handleDragLeave(e, waypoint) {
    try {
      // Only remove class if we're actually leaving the element
      if (!waypoint.contains(e.relatedTarget)) {
        waypoint.classList.remove(CONFIG.CLASSES.WAYPOINT_DRAG_OVER);
        waypoint.classList.remove(CONFIG.CLASSES.WAYPOINT_DROP_TARGET);
        if (this.dropTarget === waypoint) {
          this.dropTarget = null;
        }
      }
    } catch (error) {
      console.error('Error in drag leave:', error);
    }
  }

  /**
   * Handle drop event
   * @private
   * @param {DragEvent} e - Drag event
   * @param {HTMLElement} waypoint - Target waypoint element
   * @param {number} targetIndex - Target index
   */
  handleDrop(e, waypoint, targetIndex) {
    try {
      e.preventDefault();
      
      if (!this.draggedElement || waypoint === this.draggedElement) {
        this.handleInvalidDrop();
        return;
      }
      
      // Store the dragged element's data for finding it after reorder
      const draggedName = this.draggedElement.dataset.waypointName;
      
      // Perform the reorder first
      this.reorderWaypoints(this.draggedIndex, targetIndex);
      
      // Find the moved element at its new position and show animations
      setTimeout(() => {
        const movedElement = this.findMovedElement(draggedName, targetIndex);
        if (movedElement) {
          this.showDropSuccess(movedElement);
          
          // Show completion animation after success animation
          setTimeout(() => {
            this.showReorderComplete(movedElement);
          }, 100);
        }
      }, 50);
      
      // Announce success to screen readers
      const targetName = waypoint.dataset.waypointName || (targetIndex + 1);
      this.announceToScreenReader(`Successfully moved waypoint ${draggedName || (this.draggedIndex + 1)} to position ${targetIndex + 1}`);
      
      console.log(`Dropped waypoint at index ${targetIndex}`);
      
    } catch (error) {
      console.error('Error in drop:', error);
      this.handleInvalidDrop();
      this.showError(CONFIG.ERRORS.DRAG_DROP_ERROR || 'Error reordering waypoints');
    }
  }

  /**
   * Handle drag end event
   * @private
   * @param {DragEvent} e - Drag event
   * @param {HTMLElement} waypoint - Waypoint element
   */
  handleDragEnd(e, waypoint) {
    try {
      // Remove all drag-related classes with smooth transition
      waypoint.classList.remove(CONFIG.CLASSES.WAYPOINT_DRAGGING);
      waypoint.style.cursor = 'grab';
      
      // Clear all drop targets
      this.clearDropTargets();
      
      // Clean up state
      this.draggedElement = null;
      this.draggedIndex = -1;
      this.dropTarget = null;
      
      // Re-initialize drag and drop after animations complete
      setTimeout(() => {
        this.makeWaypointsDraggable();
      }, 800); // Longer delay to let completion animations finish
      
    } catch (error) {
      console.error('Error in drag end:', error);
    }
  }

  /**
   * Handle keyboard navigation for accessibility
   * @private
   * @param {KeyboardEvent} e - Keyboard event
   * @param {HTMLElement} waypoint - Waypoint element
   * @param {number} index - Waypoint index
   */
  handleKeyboardNavigation(e, waypoint, index) {
    try {
      const waypoints = Array.from(this.routeContainer.querySelectorAll('.waypoint-item'))
        .filter(wp => !wp.querySelector('#continue-ofp-btn'));
      
      const currentIndex = waypoints.indexOf(waypoint);
      
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (e.ctrlKey && currentIndex > 0) {
            // Move waypoint up with animation
            const waypointName = waypoint.dataset.waypointName;
            this.reorderWaypoints(currentIndex, currentIndex - 1);
            setTimeout(() => {
              const movedElement = this.findMovedElement(waypointName, currentIndex - 1);
              if (movedElement) {
                this.showDropSuccess(movedElement);
                setTimeout(() => this.showReorderComplete(movedElement), 100);
              }
            }, 50);
            this.announceToScreenReader(`Successfully moved waypoint up to position ${currentIndex}`);
          } else if (currentIndex > 0) {
            // Focus previous waypoint
            waypoints[currentIndex - 1].focus();
          }
          break;
          
        case 'ArrowDown':
          e.preventDefault();
          if (e.ctrlKey && currentIndex < waypoints.length - 1) {
            // Move waypoint down with animation
            const waypointName = waypoint.dataset.waypointName;
            this.reorderWaypoints(currentIndex, currentIndex + 1);
            setTimeout(() => {
              const movedElement = this.findMovedElement(waypointName, currentIndex + 1);
              if (movedElement) {
                this.showDropSuccess(movedElement);
                setTimeout(() => this.showReorderComplete(movedElement), 100);
              }
            }, 50);
            this.announceToScreenReader(`Successfully moved waypoint down to position ${currentIndex + 2}`);
          } else if (currentIndex < waypoints.length - 1) {
            // Focus next waypoint
            waypoints[currentIndex + 1].focus();
          }
          break;
          
        case 'Home':
          e.preventDefault();
          if (e.ctrlKey && currentIndex > 0) {
            // Move to top with animation
            const waypointName = waypoint.dataset.waypointName;
            this.reorderWaypoints(currentIndex, 0);
            setTimeout(() => {
              const movedElement = this.findMovedElement(waypointName, 0);
              if (movedElement) {
                this.showDropSuccess(movedElement);
                setTimeout(() => this.showReorderComplete(movedElement), 100);
              }
            }, 50);
            this.announceToScreenReader(`Successfully moved waypoint to top position`);
          } else {
            // Focus first waypoint
            waypoints[0]?.focus();
          }
          break;
          
        case 'End':
          e.preventDefault();
          if (e.ctrlKey && currentIndex < waypoints.length - 1) {
            // Move to bottom with animation
            const waypointName = waypoint.dataset.waypointName;
            this.reorderWaypoints(currentIndex, waypoints.length - 1);
            setTimeout(() => {
              const movedElement = this.findMovedElement(waypointName, waypoints.length - 1);
              if (movedElement) {
                this.showDropSuccess(movedElement);
                setTimeout(() => this.showReorderComplete(movedElement), 100);
              }
            }, 50);
            this.announceToScreenReader(`Successfully moved waypoint to bottom position`);
          } else {
            // Focus last waypoint
            waypoints[waypoints.length - 1]?.focus();
          }
          break;
          
        case 'Enter':
        case ' ':
          e.preventDefault();
          // Toggle selection or show details
          waypoint.click();
          break;
      }
    } catch (error) {
      console.error('Error in keyboard navigation:', error);
    }
  }

  /**
   * Handle touch start event
   * @private
   * @param {TouchEvent} e - Touch event
   * @param {HTMLElement} waypoint - Waypoint element
   * @param {number} index - Waypoint index
   */
  handleTouchStart(e, waypoint, index) {
    try {
      this.touchStartY = e.touches[0].clientY;
      this.touchCurrentY = this.touchStartY;
      this.isTouchDragging = false;
      this.touchScrollOffset = 0;
      
      // Store initial scroll position
      const scrollContainer = this.routeContainer.closest('[class*="overflow"]');
      if (scrollContainer) {
        this.touchScrollOffset = scrollContainer.scrollTop;
      }
      
      // Add touch feedback
      waypoint.style.transform = 'scale(1.02)';
      waypoint.style.transition = 'transform 0.1s ease';
      
    } catch (error) {
      console.error('Error in touch start:', error);
    }
  }

  /**
   * Handle touch move event
   * @private
   * @param {TouchEvent} e - Touch event
   * @param {HTMLElement} waypoint - Waypoint element
   */
  handleTouchMove(e, waypoint) {
    try {
      e.preventDefault(); // Prevent scrolling
      
      this.touchCurrentY = e.touches[0].clientY;
      const deltaY = this.touchCurrentY - this.touchStartY;
      
      // Start dragging if moved enough
      if (!this.isTouchDragging && Math.abs(deltaY) > 10) {
        this.isTouchDragging = true;
        this.draggedElement = waypoint;
        waypoint.classList.add(CONFIG.CLASSES.WAYPOINT_DRAGGING);
        waypoint.style.zIndex = '1000';
      }
      
      if (this.isTouchDragging) {
        // Move the element with the touch
        waypoint.style.transform = `translateY(${deltaY}px) scale(1.02)`;
        
        // Find potential drop target
        const targetElement = this.getElementUnderTouch(e.touches[0]);
        if (targetElement && targetElement !== waypoint && targetElement.classList.contains('waypoint-item')) {
          // Highlight drop target
          this.clearTouchDropTargets();
          targetElement.classList.add(CONFIG.CLASSES.WAYPOINT_DRAG_OVER);
          this.dropTarget = targetElement;
        }
      }
      
    } catch (error) {
      console.error('Error in touch move:', error);
    }
  }

  /**
   * Handle touch end event
   * @private
   * @param {TouchEvent} e - Touch event
   * @param {HTMLElement} waypoint - Waypoint element
   */
  handleTouchEnd(e, waypoint) {
    try {
      if (this.isTouchDragging && this.dropTarget) {
        // Perform drop with animations
        const waypoints = Array.from(this.routeContainer.querySelectorAll('.waypoint-item'))
          .filter(wp => !wp.querySelector('#continue-ofp-btn'));
        
        const draggedIndex = waypoints.indexOf(waypoint);
        const targetIndex = waypoints.indexOf(this.dropTarget);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
          // Store waypoint name for finding after reorder
          const waypointName = waypoint.dataset.waypointName;
          
          // Perform reorder first
          this.reorderWaypoints(draggedIndex, targetIndex);
          
          // Show success animation on moved element
          setTimeout(() => {
            const movedElement = this.findMovedElement(waypointName, targetIndex);
            if (movedElement) {
              this.showDropSuccess(movedElement);
              
              // Show completion animation
              setTimeout(() => {
                this.showReorderComplete(movedElement);
              }, 100);
            }
          }, 50);
          
          // Announce success
          this.announceToScreenReader(`Successfully moved waypoint to new position`);
        }
      } else if (this.isTouchDragging) {
        // Invalid drop
        this.handleInvalidDrop();
      }
      
      // Clean up touch drag state
      this.cleanupTouchDrag(waypoint);
      
    } catch (error) {
      console.error('Error in touch end:', error);
      this.cleanupTouchDrag(waypoint);
    }
  }

  /**
   * Get element under touch point
   * @private
   * @param {Touch} touch - Touch object
   * @returns {Element|null} Element under touch
   */
  getElementUnderTouch(touch) {
    try {
      return document.elementFromPoint(touch.clientX, touch.clientY);
    } catch (error) {
      console.error('Error getting element under touch:', error);
      return null;
    }
  }

  /**
   * Clear touch drop target highlights
   * @private
   */
  clearTouchDropTargets() {
    const waypoints = this.routeContainer.querySelectorAll('.waypoint-item');
    waypoints.forEach(wp => wp.classList.remove(CONFIG.CLASSES.WAYPOINT_DRAG_OVER));
  }

  /**
   * Clean up touch drag state
   * @private
   * @param {HTMLElement} waypoint - Waypoint element
   */
  cleanupTouchDrag(waypoint) {
    // Reset visual state
    waypoint.style.transform = '';
    waypoint.style.transition = '';
    waypoint.style.zIndex = '';
    waypoint.classList.remove(CONFIG.CLASSES.WAYPOINT_DRAGGING);
    
    // Clear drop targets
    this.clearTouchDropTargets();
    
    // Reset touch state
    this.isTouchDragging = false;
    this.draggedElement = null;
    this.dropTarget = null;
    this.touchStartY = 0;
    this.touchCurrentY = 0;
  }

  /**
   * Clear all drop target visual indicators
   * @private
   */
  clearDropTargets() {
    const allWaypoints = this.routeContainer.querySelectorAll('.waypoint-item');
    allWaypoints.forEach(wp => {
      wp.classList.remove(CONFIG.CLASSES.WAYPOINT_DRAG_OVER);
      wp.classList.remove(CONFIG.CLASSES.WAYPOINT_DROP_TARGET);
      wp.classList.remove(CONFIG.CLASSES.WAYPOINT_DROP_SUCCESS);
      wp.classList.remove(CONFIG.CLASSES.WAYPOINT_POSITION_CHANGE);
      wp.classList.remove(CONFIG.CLASSES.WAYPOINT_REORDER_COMPLETE);
      wp.classList.remove(CONFIG.CLASSES.WAYPOINT_DRAG_INVALID);
    });
  }

  /**
   * Find the moved element at its new position after reordering
   * @private
   * @param {string} waypointName - Name of the waypoint that was moved
   * @param {number} targetIndex - Expected index position
   * @returns {HTMLElement|null} The moved element or null if not found
   */
  findMovedElement(waypointName, targetIndex) {
    try {
      const waypoints = Array.from(this.routeContainer.querySelectorAll('.waypoint-item'))
        .filter(wp => !wp.querySelector('#continue-ofp-btn'));
      
      // First try to find by waypoint name at the expected position
      if (waypointName && waypoints[targetIndex] && waypoints[targetIndex].dataset.waypointName === waypointName) {
        return waypoints[targetIndex];
      }
      
      // Fallback: find by waypoint name anywhere in the list
      if (waypointName) {
        return waypoints.find(wp => wp.dataset.waypointName === waypointName) || null;
      }
      
      // Last resort: return element at target index
      return waypoints[targetIndex] || null;
    } catch (error) {
      console.error('Error finding moved element:', error);
      return null;
    }
  }

  /**
   * Show drop success animation - Simplified
   * @private
   * @param {HTMLElement} waypoint - Target waypoint
   */
  showDropSuccess(waypoint) {
    try {
      if (waypoint && waypoint.classList) {
        waypoint.classList.remove(CONFIG.CLASSES.WAYPOINT_DROP_TARGET);
        waypoint.classList.add(CONFIG.CLASSES.WAYPOINT_DROP_SUCCESS);
        
        // Remove after brief feedback
        setTimeout(() => {
          if (waypoint && waypoint.classList) {
            waypoint.classList.remove(CONFIG.CLASSES.WAYPOINT_DROP_SUCCESS);
          }
        }, 300);
      }
    } catch (error) {
      console.error('Error in showDropSuccess:', error);
    }
  }

  /**
   * Show reorder complete animation - Simplified
   * @private
   * @param {HTMLElement} waypoint - Target waypoint
   */
  showReorderComplete(waypoint) {
    try {
      if (waypoint && waypoint.classList) {
        waypoint.classList.add(CONFIG.CLASSES.WAYPOINT_REORDER_COMPLETE);
        
        // Remove after brief feedback
        setTimeout(() => {
          if (waypoint && waypoint.classList) {
            waypoint.classList.remove(CONFIG.CLASSES.WAYPOINT_REORDER_COMPLETE);
          }
        }, 400);
      }
    } catch (error) {
      console.error('Error in showReorderComplete:', error);
    }
  }

  /**
   * Handle invalid drop attempt
   * @private
   */
  handleInvalidDrop() {
    if (this.draggedElement) {
      this.draggedElement.classList.add(CONFIG.CLASSES.WAYPOINT_DRAG_INVALID);
      
      // Remove after animation
      setTimeout(() => {
        if (this.draggedElement) {
          this.draggedElement.classList.remove(CONFIG.CLASSES.WAYPOINT_DRAG_INVALID);
        }
      }, 500);
    }
  }

  /**
   * Show position change animation for affected waypoints - Simplified
   * @private
   * @param {number} fromIndex - Source index
   * @param {number} toIndex - Target index
   */
  showPositionChangeAnimation(fromIndex, toIndex) {
    try {
      const waypoints = Array.from(this.routeContainer.querySelectorAll('.waypoint-item'))
        .filter(wp => !wp.querySelector('#continue-ofp-btn'));
      
      // Simple feedback for moved waypoint only
      if (waypoints[toIndex] && waypoints[toIndex].classList) {
        waypoints[toIndex].classList.add(CONFIG.CLASSES.WAYPOINT_POSITION_CHANGE);
        
        setTimeout(() => {
          if (waypoints[toIndex] && waypoints[toIndex].classList) {
            waypoints[toIndex].classList.remove(CONFIG.CLASSES.WAYPOINT_POSITION_CHANGE);
          }
        }, 200);
      }
    } catch (error) {
      console.error('Error in showPositionChangeAnimation:', error);
    }
  }

  /**
   * Reorder waypoints in the DOM and update waypoint manager
   * @private
   * @param {number} fromIndex - Source index
   * @param {number} toIndex - Target index
   */
  reorderWaypoints(fromIndex, toIndex) {
    try {
      if (fromIndex === toIndex) return;
      
      const waypoints = Array.from(this.routeContainer.querySelectorAll('.waypoint-item'))
        .filter(wp => !wp.querySelector('#continue-ofp-btn'));
      
      if (fromIndex < 0 || fromIndex >= waypoints.length || toIndex < 0 || toIndex >= waypoints.length) {
        console.warn('Invalid reorder indices:', fromIndex, toIndex);
        return;
      }
      
      const fromElement = waypoints[fromIndex];
      const toElement = waypoints[toIndex];
      
      // Show position change animation for affected waypoints
      this.showPositionChangeAnimation(fromIndex, toIndex);
      
      // Reorder DOM elements with smooth animation
      fromElement.classList.add(CONFIG.CLASSES.WAYPOINT_SMOOTH_INSERT);
      
      if (fromIndex < toIndex) {
        // Moving down - insert after target
        toElement.parentNode.insertBefore(fromElement, toElement.nextSibling);
      } else {
        // Moving up - insert before target
        toElement.parentNode.insertBefore(fromElement, toElement);
      }
      
      // Clean up smooth insert animation
      setTimeout(() => {
        fromElement.classList.remove(CONFIG.CLASSES.WAYPOINT_SMOOTH_INSERT);
      }, 500);
      
      // Update waypoint manager's planned route
      if (this.waypointManager) {
        const plannedRoute = this.waypointManager.getPlannedRoute();
        if (plannedRoute.length > Math.max(fromIndex, toIndex)) {
          // Reorder the array
          const [movedItem] = plannedRoute.splice(fromIndex, 1);
          plannedRoute.splice(toIndex, 0, movedItem);
          
          // Update waypoint manager
          this.waypointManager.plannedRoute = plannedRoute;
          
          console.log(`Reordered waypoints: moved index ${fromIndex} to ${toIndex}`);
          
          // CRITICAL FIX: Update flight calculator and state management after reordering
          // This ensures Route Legs are recalculated with the new order
          this.updateFlightDataAfterReorder(plannedRoute);
        }
      }
      
      // Update ARIA labels
      this.updateAriaLabels();
      
    } catch (error) {
      console.error('Error reordering waypoints:', error);
      throw error;
    }
  }

  /**
   * Update flight data and state management after reordering waypoints
   * @private
   * @param {Array} newRoute - The reordered route array
   */
  updateFlightDataAfterReorder(newRoute) {
    try {
      console.log('🔄 Updating flight data after waypoint reorder');
      
      // Update state management with new route order
      stateManager.setState('flightPlan.route', [...newRoute]);
      console.log('📊 State updated with reordered route');
      
      // Get the flight calculator from the main app and update route data
      if (typeof window !== 'undefined' && window.SystemRemasterApp) {
        const flightCalculator = window.SystemRemasterApp.getModule('flightCalculator');
        if (flightCalculator && typeof flightCalculator.updateRouteData === 'function') {
          flightCalculator.updateRouteData(newRoute);
          console.log('🧮 Flight calculator updated with reordered route');
        }
      }
      
      // Update waypoint counter to reflect any changes
      if (this.waypointManager && typeof this.waypointManager.updateWaypointCounter === 'function') {
        this.waypointManager.updateWaypointCounter();
        console.log('📊 Waypoint counter updated after reorder');
      }
      
      // Update critical point dropdown to match new route order
      if (this.waypointManager && typeof this.waypointManager.updateCriticalPointDropdown === 'function') {
        this.waypointManager.updateCriticalPointDropdown();
        console.log('🎯 Critical point dropdown updated after reorder');
      }
      
    } catch (error) {
      console.error('Error updating flight data after reorder:', error);
    }
  }

  /**
   * Update ARIA labels after reordering
   * @private
   */
  updateAriaLabels() {
    try {
      const waypoints = this.routeContainer.querySelectorAll('.waypoint-item');
      const waypointCount = waypoints.length;
      
      waypoints.forEach((waypoint, index) => {
        if (!waypoint.querySelector('#continue-ofp-btn')) {
          const waypointName = waypoint.dataset.waypointName || `Waypoint ${index + 1}`;
          waypoint.setAttribute('aria-label', `${waypointName}. Draggable item ${index + 1} of ${waypointCount}`);
        }
      });
    } catch (error) {
      console.error('Error updating ARIA labels:', error);
    }
  }

  /**
   * Get waypoint count
   * @private
   * @returns {number} Number of waypoints
   */
  getWaypointCount() {
    if (!this.routeContainer) return 0;
    
    const waypoints = this.routeContainer.querySelectorAll('.waypoint-item');
    return Array.from(waypoints).filter(wp => !wp.querySelector('#continue-ofp-btn')).length;
  }

  /**
   * Setup mutation observer to handle dynamically added waypoints
   * @private
   */
  setupMutationObserver() {
    if (!this.routeContainer) return;
    
    this.mutationObserver = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check if waypoint items were added or removed
          const addedWaypoints = Array.from(mutation.addedNodes)
            .filter(node => node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('waypoint-item'));
          
          const removedWaypoints = Array.from(mutation.removedNodes)
            .filter(node => node.nodeType === Node.ELEMENT_NODE && node.classList?.contains('waypoint-item'));
          
          if (addedWaypoints.length > 0 || removedWaypoints.length > 0) {
            shouldUpdate = true;
          }
        }
      });
      
      if (shouldUpdate) {
        // Debounce updates
        clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => {
          this.makeWaypointsDraggable();
        }, 100);
      }
    });
    
    this.mutationObserver.observe(this.routeContainer, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Announce message to screen readers
   * @private
   * @param {string} message - Message to announce
   */
  announceToScreenReader(message) {
    try {
      const announcement = document.createElement('div');
      announcement.setAttribute('aria-live', 'polite');
      announcement.setAttribute('aria-atomic', 'true');
      announcement.className = 'sr-only';
      announcement.textContent = message;
      
      document.body.appendChild(announcement);
      
      // Remove after announcement
      setTimeout(() => {
        if (announcement.parentNode) {
          document.body.removeChild(announcement);
        }
      }, 1000);
    } catch (error) {
      console.error('Error announcing to screen reader:', error);
    }
  }

  /**
   * Show error message
   * @private
   * @param {string} message - Error message
   */
  showError(message) {
    console.error(message);
    
    // Could integrate with a notification system
    const errorDiv = document.createElement('div');
    errorDiv.className = 'drag-drop-error-notification';
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #ef4444;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
    `;
    errorDiv.textContent = message;
    
    document.body.appendChild(errorDiv);
    
    setTimeout(() => {
      if (errorDiv.parentNode) {
        document.body.removeChild(errorDiv);
      }
    }, 5000);
  }

  /**
   * Enable drag and drop
   */
  enable() {
    if (!this.isInitialized) return;
    
    this.makeWaypointsDraggable();
    console.log('Drag and drop enabled');
  }

  /**
   * Disable drag and drop
   */
  disable() {
    if (!this.routeContainer) return;
    
    const waypoints = this.routeContainer.querySelectorAll('.waypoint-item');
    waypoints.forEach(waypoint => {
      waypoint.draggable = false;
      this.removeWaypointEventListeners(waypoint);
    });
    
    console.log('Drag and drop disabled');
  }

  /**
   * Check if drag and drop is initialized
   * @returns {boolean} True if initialized
   */
  isDragDropInitialized() {
    return this.isInitialized;
  }

  /**
   * Destroy drag and drop manager and clean up resources
   */
  destroy() {
    // Clean up event listeners
    this.eventCleanupFunctions.forEach(cleanup => cleanup());
    this.eventCleanupFunctions = [];
    
    // Clean up waypoint listeners
    if (this.routeContainer) {
      const waypoints = this.routeContainer.querySelectorAll('.waypoint-item');
      waypoints.forEach(waypoint => {
        this.removeWaypointEventListeners(waypoint);
        waypoint.draggable = false;
      });
    }
    
    // Clean up mutation observer
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
    
    // Clear timeouts
    if (this.updateTimeout) {
      clearTimeout(this.updateTimeout);
    }
    
    // Reset state
    this.draggedElement = null;
    this.draggedIndex = -1;
    this.dropTarget = null;
    this.routeContainer = null;
    this.isInitialized = false;
    
    console.log('DragDropManager destroyed');
  }
}