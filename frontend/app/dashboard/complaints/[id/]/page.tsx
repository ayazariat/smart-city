                   <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                     {[
                       {level: 'LOW', activeColor: 'bg-green-500 hover:bg-green-600 text-white border-2 border-green-400', inactiveColor: 'border-2 border-green-200 text-green-600 bg-transparent hover:bg-green-50', score: 3},
                       {level: 'MEDIUM', activeColor: 'bg-amber-500 hover:bg-amber-600 text-white border-2 border-amber-400', inactiveColor: 'border-2 border-amber-200 text-amber-600 bg-transparent hover:bg-amber-50', score: 6},
                       {level: 'HIGH', activeColor: 'bg-orange-500 hover:bg-orange-600 text-white border-2 border-orange-400', inactiveColor: 'border-2 border-orange-200 text-orange-600 bg-transparent hover:bg-orange-50', score: 8},
                       {level: 'CRITICAL', activeColor: 'bg-red-500 hover:bg-red-600 text-white border-2 border-red-400 shadow-md shadow-red-200', inactiveColor: 'border-2 border-red-200 text-red-600 bg-transparent hover:bg-red-50', score: 10}
                     ].map(({level, activeColor, inactiveColor, score}) => {
                       const isActive = complaint.urgency === level;
                       const buttonClass = `p-3 rounded-xl font-semibold transition-all ${isActive ? activeColor : inactiveColor} shadow-sm hover:shadow-lg hover:scale-[1.02] active:scale-100`;
                       return (
                         <Button
                           key={level}
                           className={buttonClass}
                           variant="ghost"
                           size="sm"
                           onClick={async () => {
                             setActionLoading(true);
                             try {
                               const response = await managerService.updatePriority(
                                 complaintId,
                                 { urgency: level as string, priorityScore: score }
                               );
                               if (response.success) {
                                 await refreshComplaint();
                                 // Toast success
                                 console.log('Priority updated successfully');
                               }
                             } catch (err) {
                               console.error('Priority update failed', err);
                             } finally {
                               setActionLoading(false);
                               setActionModal(null);
                             }
                           }}
                           disabled={actionLoading}
                         >
                           <Flag className="w-4 h-4 mr-1" />
                           {level}
                           <div className="text-xs mt-1 opacity-90">
                             Score: {score}
                           </div>
                         </Button>
                       );
                     })}
                   </div>